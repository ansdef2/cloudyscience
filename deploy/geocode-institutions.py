#!/usr/bin/env python3
"""
Уточняет координаты учреждений по адресу — для кластеров на карте.

Патч данных при старте сервера проставляет ориентировочные координаты
для адресов на Большой Московской. Этот скрипт находит точные через
геокодер OpenStreetMap (Nominatim) и показывает, насколько они расходятся.

    BASE=https://cloudyscience.ru/api python3 deploy/geocode-institutions.py

Без флага --apply только печатает найденное. С --apply записывает
координаты через API (нужен вход администратора). Город подставляется
к адресу из CITY, по умолчанию «Великий Новгород».
"""

import getpass
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request

BASE = os.environ.get('BASE', 'https://cloudyscience.ru/api')
CITY = os.environ.get('CITY', 'Великий Новгород')
NOMINATIM = 'https://nominatim.openstreetmap.org/search'
# Правила Nominatim: осмысленный User-Agent и не больше запроса в секунду
USER_AGENT = 'cloudyscience-geocode/1.0 (+https://cloudyscience.ru)'


def call(method, path, token=None, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(BASE + path, data=data, method=method)
    request.add_header('Content-Type', 'application/json')
    if token:
        request.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(request) as response:
        body = response.read().decode()
    return json.loads(body) if body else None


def street_address(address):
    """«Большая Московская ул., 39, корп. 1» → «Большая Московская улица 39»"""
    parts = [part.strip() for part in address.split(',')]
    street = parts[0].replace(' ул.', ' улица')
    house = parts[1] if len(parts) > 1 else ''
    return f'{street} {house}'.strip()


def geocode(address):
    query = urllib.parse.urlencode({'q': f'{street_address(address)}, {CITY}', 'format': 'json', 'limit': 1})
    request = urllib.request.Request(f'{NOMINATIM}?{query}', headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(request) as response:
        found = json.loads(response.read().decode())
    time.sleep(1.1)
    if not found:
        return None
    return float(found[0]['lat']), float(found[0]['lon'])


def distance_m(a, b):
    lat = math.radians((a[0] + b[0]) / 2)
    dy = (a[0] - b[0]) * 111_320
    dx = (a[1] - b[1]) * 111_320 * math.cos(lat)
    return round(math.hypot(dx, dy))


def main():
    apply = '--apply' in sys.argv
    institutions = call('GET', '/institutions')
    updates = []

    for item in institutions:
        point = geocode(item['address'])
        current = (item.get('latitude'), item.get('longitude'))

        if not point:
            print(f'  {item["name"]}: адрес не найден — «{street_address(item["address"])}»')
            continue

        shift = distance_m(point, current) if None not in current else None
        note = f'сдвиг {shift} м' if shift is not None else 'координат не было'
        print(f'  {item["name"]}: {point[0]:.5f}, {point[1]:.5f} ({note})')
        updates.append((item, point))

    if not apply:
        print('\nЧтобы записать координаты, запустите с --apply')
        return

    email = os.environ.get('ADMIN_EMAIL') or input('Почта администратора: ').strip()
    password = os.environ.get('ADMIN_PASSWORD') or getpass.getpass('Пароль администратора: ')
    token = call('POST', '/auth/login', payload={'email': email, 'password': password})['token']

    for item, (lat, lon) in updates:
        call('PUT', f'/institutions/{item["id"]}', token, {'latitude': lat, 'longitude': lon})
        print(f'  записано: {item["name"]}')


if __name__ == '__main__':
    main()
