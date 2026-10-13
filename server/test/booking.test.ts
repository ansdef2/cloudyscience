import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { call, futureDate, makeAdmin, makeCatalog, register, start, stop, upload } from './helpers';

let equipmentId = '';
let courseId = '';

before(async () => {
  await start();
  await makeAdmin();
  const catalog = await makeCatalog();
  equipmentId = catalog.equipment.id;
  courseId = catalog.course.id;
});
after(stop);

describe('бронирование', () => {
  test('слоты строятся по часам работы оборудования', async () => {
    const { body } = await call('GET', `/equipment/${equipmentId}/availability?date=${futureDate()}`);
    assert.deepEqual(
      body.slots.map((slot: { time: string }) => slot.time),
      ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
    );
  });

  test('время вне часов работы и прошедшая дата отклоняются', async () => {
    const user = await register('Ира');
    const late = await call('POST', '/bookings', { equipmentId, date: futureDate(), time: '20:00' }, user.token);
    assert.equal(late.status, 400);
    const past = await call('POST', '/bookings', { equipmentId, date: '2020-01-01', time: '10:00' }, user.token);
    assert.equal(past.status, 400);
  });

  test('один слот — одна бронь, даже при одновременных запросах', async () => {
    const users = await Promise.all(Array.from({ length: 8 }, (_, index) => register(`Гонщик ${index}`)));
    const date = futureDate(5);
    const results = await Promise.all(
      users.map((user) => call('POST', '/bookings', { equipmentId, date, time: '12:00' }, user.token))
    );
    assert.equal(results.filter((result) => result.status === 201).length, 1);
    assert.equal(results.filter((result) => result.status === 409).length, 7);

    const { body } = await call('GET', `/equipment/${equipmentId}/availability?date=${date}`);
    assert.equal(body.slots.find((slot: { time: string }) => slot.time === '12:00').status, 'taken');
  });

  test('отменённая бронь освобождает слот', async () => {
    const [first, second] = [await register('Первый'), await register('Второй')];
    const date = futureDate(6);
    const booking = await call('POST', '/bookings', { equipmentId, date, time: '15:00' }, first.token);
    await call('PUT', `/bookings/${booking.body.id}`, { status: 'cancelled' }, first.token);
    const retry = await call('POST', '/bookings', { equipmentId, date, time: '15:00' }, second.token);
    assert.equal(retry.status, 201);
  });

  test('автор не может подтвердить свою бронь, чужую — не видит', async () => {
    const [owner, stranger] = [await register('Владелец'), await register('Чужой')];
    const booking = await call('POST', '/bookings', { equipmentId, date: futureDate(7), time: '10:00' }, owner.token);
    const confirm = await call('PUT', `/bookings/${booking.body.id}`, { status: 'confirmed' }, owner.token);
    assert.equal(confirm.status, 403);
    assert.equal((await call('GET', `/bookings/${booking.body.id}`, undefined, stranger.token)).status, 404);
  });
});

describe('файлы к брони', () => {
  test('файл видят автор и администратор, чужой — нет', async () => {
    const [owner, stranger] = [await register('Конструктор'), await register('Посторонний')];
    const uploaded = await upload(owner.token, 'деталь.gcode', 'G1 X10 Y10');
    assert.equal(uploaded.status, 201);
    assert.equal(uploaded.body.name, 'деталь.gcode');

    const booking = await call(
      'POST',
      '/bookings',
      { equipmentId, date: futureDate(8), time: '11:00', fileIds: [uploaded.body.id] },
      owner.token
    );
    assert.equal(booking.status, 201);
    assert.deepEqual(booking.body.files, ['деталь.gcode']);

    assert.equal((await call('GET', `/uploads/${uploaded.body.id}`, undefined, owner.token)).status, 200);
    assert.equal((await call('GET', `/uploads/${uploaded.body.id}`, undefined, stranger.token)).status, 404);
  });

  test('опасные типы файлов не принимаются', async () => {
    const user = await register('Взломщик');
    const result = await upload(user.token, 'page.html', '<script>alert(1)</script>');
    assert.equal(result.status, 400);
  });
});

describe('курс', () => {
  test('мест не больше заданного, второй раз записаться нельзя', async () => {
    const users = await Promise.all(Array.from({ length: 6 }, (_, index) => register(`Студент ${index}`)));
    const results = await Promise.all(
      users.map((user) => call('POST', `/courses/${courseId}/enroll`, undefined, user.token))
    );
    assert.equal(results.filter((result) => result.status === 201 || result.status === 200).length, 3);

    const winner = users[results.findIndex((result) => result.status < 300)];
    const again = await call('POST', `/courses/${courseId}/enroll`, undefined, winner.token);
    assert.equal(again.status, 409);
  });
});
