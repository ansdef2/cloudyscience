import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { call, makeAdmin, register, start, stop } from './helpers';

let base = '';
let adminToken = '';

before(async () => {
  base = await start();
  adminToken = (await makeAdmin()).token;
});
after(stop);

describe('команды', () => {
  test('в команду попадают только по принятому приглашению', async () => {
    const [owner, guest] = [await register('Капитан'), await register('Гость')];
    const team = await call('POST', '/teams', { name: 'Лаборатория' }, owner.token);

    const invite = await call('POST', `/teams/${team.body.id}/invitations`, { userId: guest.user.id }, owner.token);
    assert.equal(invite.status, 201);
    assert.equal((await call('GET', `/teams/${team.body.id}/messages`, undefined, guest.token)).status, 403);

    const invitations = await call('GET', '/teams/invitations', undefined, guest.token);
    assert.equal(invitations.body.length, 1);
    await call('POST', `/teams/invitations/${invitations.body[0].id}/accept`, undefined, guest.token);
    assert.equal((await call('GET', `/teams/${team.body.id}/messages`, undefined, guest.token)).status, 200);

    const notifications = await call('GET', '/notifications', undefined, owner.token);
    assert.ok(notifications.body.items.some((item: { type: string }) => item.type === 'team_invitation_accepted'));
  });

  test('приглашать может только создатель команды', async () => {
    const [owner, member, other] = [await register('Создатель'), await register('Участник'), await register('Другой')];
    const team = await call('POST', '/teams', { name: 'Сенсоры' }, owner.token);
    const result = await call('POST', `/teams/${team.body.id}/invitations`, { userId: other.user.id }, member.token);
    assert.equal(result.status, 403);
  });
});

describe('чаты и безопасность', () => {
  test('сообщение приходит собеседнику по сокету', async () => {
    const [alice, bob] = [await register('Алиса'), await register('Боб')];
    const socket = new WebSocket(base.replace(/^http/, 'ws') + '/ws');
    const received = new Promise<any>((resolve) => {
      socket.on('message', (raw) => {
        const event = JSON.parse(String(raw));
        if (event.type === 'ready') {
          call('POST', `/chats/users/${bob.user.id}/messages`, { text: 'Привет!' }, alice.token);
        }
        if (event.type === 'message') resolve(event);
      });
    });
    socket.on('open', () => socket.send(JSON.stringify({ type: 'auth', token: bob.token })));

    const event = await received;
    socket.close();
    assert.equal(event.kind, 'user');
    assert.equal(event.chatId, alice.user.id);
    assert.equal(event.message.text, 'Привет!');
  });

  test('сокет без токена закрывается', async () => {
    const socket = new WebSocket(base.replace(/^http/, 'ws') + '/ws');
    socket.on('open', () => socket.send(JSON.stringify({ type: 'auth', token: 'bad' })));
    const code = await new Promise((resolve) => socket.on('close', resolve));
    assert.equal(code, 4001);
  });

  test('заблокированный собеседник не может писать', async () => {
    const [victim, spammer] = [await register('Жертва'), await register('Спамер')];
    await call('POST', `/safety/blocks/${spammer.user.id}`, undefined, victim.token);
    const message = await call('POST', `/chats/users/${victim.user.id}/messages`, { text: 'купи' }, spammer.token);
    assert.equal(message.status, 403);
    assert.equal(message.body.code, 'BLOCKED_PEER');
  });

  test('жалоба на сообщение доходит до администратора с текстом', async () => {
    const [reporter, offender] = [await register('Свидетель'), await register('Нарушитель')];
    await call('POST', `/chats/users/${reporter.user.id}/messages`, { text: 'оскорбление' }, offender.token);
    const chat = await call('GET', `/chats/users/${offender.user.id}/messages`, undefined, reporter.token);
    const report = await call(
      'POST',
      '/safety/reports',
      { messageId: chat.body.messages[0].id, reason: 'insult' },
      reporter.token
    );
    assert.equal(report.status, 201);

    // Чужое сообщение в жалобу не подставить
    const stranger = await register('Посторонний');
    const forged = await call('POST', '/safety/reports', { messageId: chat.body.messages[0].id, reason: 'spam' }, stranger.token);
    assert.equal(forged.status, 404);

    const reports = await call('GET', '/admin/reports', undefined, adminToken);
    assert.ok(reports.body.some((item: { messageText: string }) => item.messageText === 'оскорбление'));
  });

  test('удаление аккаунта обезличивает данные и закрывает вход', async () => {
    const user = await register('Уходящий');
    const removed = await call('DELETE', '/users/me', { password: 'password123' }, user.token);
    assert.equal(removed.status, 200);
    const login = await call('POST', '/auth/login', { email: user.user.email, password: 'password123' });
    assert.equal(login.status, 401);
  });
});
