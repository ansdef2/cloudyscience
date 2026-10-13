import './env';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkingHours, siteNow, slotsFor, validateSlot, addDays } from '../src/utils/schedule';
import { ageOn } from '../src/controllers/authController';

describe('часы работы', () => {
  test('разбирает разные записи часов', () => {
    assert.deepEqual(parseWorkingHours('9:00-19:00'), { start: 540, end: 1140 });
    assert.deepEqual(parseWorkingHours('Пн–Пт 10:00 – 17:30'), { start: 600, end: 1050 });
    // Непонятная строка — запасные 9–18
    assert.deepEqual(parseWorkingHours('круглосуточно'), { start: 540, end: 1080 });
  });

  test('последний слот начинается за час до закрытия', () => {
    assert.deepEqual(slotsFor('16:00-18:30'), ['16:00', '17:00']);
  });

  test('проверка слота', () => {
    const date = addDays(siteNow().date, 2);
    assert.equal(validateSlot(date, '10:00', '10:00-18:00'), null);
    assert.match(String(validateSlot(date, '9:00', '10:00-18:00')), /не работает/);
    assert.match(String(validateSlot('01.01.2030', '10:00', '10:00-18:00')), /ГГГГ-ММ-ДД/);
    assert.match(String(validateSlot(addDays(siteNow().date, 200), '10:00', '10:00-18:00')), /90 дней/);
  });
});

describe('возраст', () => {
  test('полные годы считаются по дню рождения', () => {
    assert.equal(ageOn('2012-10-14', '2026-10-13'), 13);
    assert.equal(ageOn('2012-10-13', '2026-10-13'), 14);
  });
});
