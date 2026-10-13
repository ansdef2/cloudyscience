import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { call, makeAdmin, register, start, stop } from './helpers';

before(start);
after(stop);

describe('регистрация', () => {
  test('без согласия с документами аккаунт не создаётся', async () => {
    const { status, body } = await call('POST', '/auth/register', {
      email: 'no-consent@test.ru',
      password: 'password123',
      name: 'Без согласия',
      birthDate: '2000-01-01',
    });
    assert.equal(status, 400);
    assert.equal(body.code, 'CONSENT_REQUIRED');
  });

  test('короткий пароль отклоняется', async () => {
    const { status } = await call('POST', '/auth/register', {
      email: 'short@test.ru',
      password: '123',
      name: 'Коротко',
      birthDate: '2000-01-01',
      consent: true,
    });
    assert.equal(status, 400);
  });

  test('ребёнку до 14 лет нужна почта родителя, до согласия — ограничения', async () => {
    const withoutParent = await call('POST', '/auth/register', {
      email: 'kid@test.ru',
      password: 'password123',
      name: 'Петя',
      birthDate: '2017-03-03',
      consent: true,
    });
    assert.equal(withoutParent.body.code, 'PARENT_REQUIRED');

    const kid = await register('Петя', { birthDate: '2017-03-03', parentEmail: 'mom@test.ru' });
    const profile = await call('GET', '/auth/profile', undefined, kid.token);
    assert.equal(profile.body.parentConsentStatus, 'pending');

    const team = await call('POST', '/teams', { name: 'Ракета' }, kid.token);
    assert.equal(team.status, 403);
    assert.equal(team.body.code, 'PARENT_CONSENT_REQUIRED');

    // Взрослый не видит ребёнка в поиске и не может ему написать
    const adult = await register('Взрослый');
    const directory = await call('GET', '/users/directory', undefined, adult.token);
    assert.ok(!directory.body.some((user: { id: string }) => user.id === kid.user.id));
    const message = await call('POST', `/chats/users/${kid.user.id}/messages`, { text: 'привет' }, adult.token);
    assert.equal(message.status, 403);
  });

  test('администратор выдаёт ссылку согласия, родитель подтверждает один раз', async () => {
    const admin = await makeAdmin();
    const kid = await register('Маша', { birthDate: '2016-01-01', parentEmail: 'dad@test.ru' });
    const link = await call('POST', `/admin/users/${kid.user.id}/parent-consent-link`, undefined, admin.token);
    const token = String(link.body.url).split('token=')[1];

    const confirm = await call('POST', '/auth/parent-consent', { token, agree: true });
    assert.equal(confirm.status, 200);
    const again = await call('POST', '/auth/parent-consent', { token, agree: true });
    assert.equal(again.status, 400);

    const team = await call('POST', '/teams', { name: 'Ракета' }, kid.token);
    assert.equal(team.status, 201);
  });
});

describe('пароль и сессии', () => {
  test('смена пароля требует текущий и завершает прежние входы', async () => {
    const user = await register('Анна');
    const wrong = await call('PUT', '/users/me/password', { currentPassword: 'nope', newPassword: 'another123' }, user.token);
    assert.equal(wrong.status, 400);

    const changed = await call(
      'PUT',
      '/users/me/password',
      { currentPassword: 'password123', newPassword: 'another123' },
      user.token
    );
    assert.equal(changed.status, 200);
    assert.equal((await call('GET', '/auth/profile', undefined, user.token)).status, 401);
    assert.equal((await call('GET', '/auth/profile', undefined, changed.body.token)).status, 200);
  });

  test('сброс пароля по ссылке: ответ не выдаёт, есть ли почта', async () => {
    const unknown = await call('POST', '/auth/forgot', { email: 'nobody@test.ru' });
    const user = await register('Борис');
    const known = await call('POST', '/auth/forgot', { email: user.user.email });
    assert.equal(unknown.status, 200);
    assert.equal(unknown.body.message, known.body.message);
  });

  test('вход не зависит от регистра почты', async () => {
    const user = await register('Вера');
    const login = await call('POST', '/auth/login', { email: user.user.email.toUpperCase(), password: 'password123' });
    assert.equal(login.status, 200);
  });
});

describe('права', () => {
  test('пользователь не может выдать себе роль администратора', async () => {
    const user = await register('Хакер');
    await call('PUT', `/users/${user.user.id}`, { role: 'admin', name: 'Хакер' }, user.token);
    const profile = await call('GET', '/auth/profile', undefined, user.token);
    assert.equal(profile.body.role, 'user');
  });

  test('публиковать посты может только администратор', async () => {
    const user = await register('Автор');
    const post = await call('POST', '/posts', { title: 'Пост', text: 'Текст' }, user.token);
    assert.equal(post.status, 403);
  });

  test('заблокированный не может войти', async () => {
    const admin = await call('POST', '/auth/login', { email: 'admin@test.ru', password: 'admin-password' });
    const user = await register('Спамер');
    await call('PUT', `/admin/users/${user.user.id}`, { isBlocked: true, blockedReason: 'спам' }, admin.body.token);
    const login = await call('POST', '/auth/login', { email: user.user.email, password: 'password123' });
    assert.equal(login.status, 403);
    assert.equal(login.body.code, 'BLOCKED');
  });
});
