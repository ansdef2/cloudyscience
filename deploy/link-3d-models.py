#!/usr/bin/env python3
"""
Привязывает 3D-модели к позициям оборудования.

Модели лежат в frontend/public/models/<папка>/, привязка описывается
в deploy/models-map.json:

    {
      "Фрезерный станок": "/models/frezer/model.obj",
      "3D принтер":       "/models/printer/scene.glb"
    }

Запуск без файла привязки печатает список оборудования и найденные
папки с моделями — по нему удобно этот файл заполнить.

    BASE=https://cloudyscience.ru/api python3 deploy/link-3d-models.py
"""

import getpass
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

BASE = os.environ.get('BASE', 'https://cloudyscience.ru/api')
ROOT = pathlib.Path(__file__).resolve().parent.parent
MAP_FILE = ROOT / 'deploy' / 'models-map.json'
MODELS_DIR = ROOT / 'frontend' / 'public' / 'models'
MODEL_SUFFIXES = {'.obj', '.glb', '.gltf'}


def call(method, path, token=None, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(BASE + path, data=data, method=method)
    request.add_header('Content-Type', 'application/json')
    if token:
        request.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(request) as response:
        body = response.read().decode()
    return json.loads(body) if body else None


def found_models():
    if not MODELS_DIR.exists():
        return []
    return sorted(
        '/models/' + str(path.relative_to(MODELS_DIR)).replace(os.sep, '/')
        for path in MODELS_DIR.rglob('*')
        if path.suffix.lower() in MODEL_SUFFIXES
    )


def main():
    equipment = call('GET', '/equipment')

    if not MAP_FILE.exists():
        print('Файла привязки нет:', MAP_FILE)
        print('\nОборудование в базе:')
        for item in equipment:
            mark = '3D есть' if item.get('image3d') else '—'
            print(f'  {item["name"]}  [{mark}]')
        print('\nНайденные модели:')
        for path in found_models() or ['  (папка frontend/public/models пуста)']:
            print(' ', path)
        print('\nСоздайте deploy/models-map.json вида {"Название позиции": "/models/папка/файл.obj"}')
        return

    mapping = json.loads(MAP_FILE.read_text(encoding='utf-8'))
    by_name = {item['name']: item for item in equipment}

    missing = [name for name in mapping if name not in by_name]
    if missing:
        print('В базе нет таких позиций:', ', '.join(missing))
        print('Проверьте названия — они должны совпадать точно.')
        sys.exit(1)

    email = os.environ.get('ADMIN_EMAIL') or input('Почта администратора: ').strip()
    password = os.environ.get('ADMIN_PASSWORD') or getpass.getpass('Пароль администратора: ')
    try:
        token = call('POST', '/auth/login', payload={'email': email, 'password': password})['token']
    except urllib.error.HTTPError as error:
        sys.exit(f'Не удалось войти ({error.code}). Проверьте почту и пароль.')

    for name, model_path in mapping.items():
        file_on_disk = ROOT / 'frontend' / 'public' / model_path.lstrip('/')
        if not file_on_disk.exists():
            print(f'ПРОПУЩЕНО {name}: файла {model_path} нет на диске')
            continue
        call('PUT', '/equipment/' + by_name[name]['id'], token, {'image3d': model_path})
        print(f'{name} → {model_path}')

    print('Готово. Пересоберите фронтенд, чтобы модели попали в образ: dc up -d --build')


if __name__ == '__main__':
    main()
