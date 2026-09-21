#!/usr/bin/env python3
"""
Делает непригодными для входа демо-аккаунты, оставшиеся от прежнего сида
(почты на @cloudco.ru с паролями, напечатанными в исходниках).

Удалять их нельзя: на авторов ссылаются посты. Поэтому им ставится
случайный пароль, которого не знает никто.

Запуск на сервере:  python3 deploy/cleanup-demo-users.py
"""

import getpass
import json
import os
import secrets
import sys
import urllib.error
import urllib.request

BASE = os.environ.get('BASE', 'http://localhost/api')
LEGACY_DOMAIN = '@cloudco.ru'


def call(method, path, token=None, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(BASE + path, data=data, method=method)
    request.add_header('Content-Type', 'application/json')
    if token:
        request.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(request) as response:
        body = response.read().decode()
    return json.loads(body) if body else None


def main():
    email = os.environ.get('ADMIN_EMAIL') or input('Почта администратора: ').strip()
    password = os.environ.get('ADMIN_PASSWORD') or getpass.getpass('Пароль администратора: ')

    try:
        token = call('POST', '/auth/login', payload={'email': email, 'password': password})['token']
    except urllib.error.HTTPError as error:
        sys.exit(f'Не удалось войти ({error.code}). Проверьте почту и пароль.')

    me = call('GET', '/auth/profile', token)
    changed = 0

    for user in call('GET', '/users', token):
        if user['id'] == me['id'] or user.get('role') == 'admin':
            continue
        if not user['email'].endswith(LEGACY_DOMAIN):
            continue
        call('PUT', '/users/' + user['id'], token, {'password': secrets.token_urlsafe(24)})
        print('пароль заменён на случайный:', user['email'])
        changed += 1

    print(f'Готово. Затронуто учётных записей: {changed}.')
    if not changed:
        print('Демо-аккаунтов со старыми почтами не найдено — вычищать нечего.')


if __name__ == '__main__':
    main()
