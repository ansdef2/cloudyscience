#!/usr/bin/env python3
"""
Генератор изображений-заглушек в палитре прототипа.

Картинки из Figma выгрузить не удалось (домен режет политика окружения),
а пустые слоты ломали вид экранов. Скрипт рисует абстрактные подложки
в тех же цветах, что и макет: это не фотографии, а временная замена.
Реальные снимки кладутся поверх по списку из ASSETS_PROTOTYPE.md.

Запуск: python3 scripts/generate-placeholders.py
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
FONT_PATH = PUBLIC / "fonts" / "AdvakenSans-Expanded.otf"

# Палитра из макета
BG_TOP = (12, 0, 32)
BG_BOTTOM = (7, 7, 9)
PURPLE = (193, 0, 232)
VIOLET = (106, 10, 126)
BLUE = (0, 66, 232)
TEAL = (0, 192, 183)
GREEN = (0, 179, 125)
CRIMSON = (179, 0, 71)
AMBER = (179, 95, 0)


def vertical_gradient(size, top, bottom):
    """Вертикальная заливка от одного цвета к другому"""
    width, height = size
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        t = y / max(height - 1, 1)
        draw.line(
            [(0, y), (width, y)],
            fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)),
        )
    return image


def add_glow(image, center, radius, color, strength=0.85):
    """Мягкое радиальное свечение поверх изображения"""
    glow = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(glow)
    cx, cy = center
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(radius * 0.55))
    tint = Image.new("RGB", image.size, color)
    return Image.composite(
        Image.blend(image, tint, strength), image, glow
    )


def abstract(size, palette, seed, blobs=4):
    """Абстрактная подложка: градиент плюс несколько цветных пятен"""
    rng = random.Random(seed)
    image = vertical_gradient(size, BG_TOP, BG_BOTTOM)
    width, height = size

    for i in range(blobs):
        color = palette[i % len(palette)]
        cx = rng.randint(int(width * 0.1), int(width * 0.9))
        cy = rng.randint(int(height * 0.15), int(height * 0.95))
        radius = rng.randint(int(min(size) * 0.22), int(min(size) * 0.5))
        image = add_glow(image, (cx, cy), radius, color, strength=rng.uniform(0.4, 0.75))

    return image.filter(ImageFilter.GaussianBlur(1.2))


def save(image, relative, quality=88):
    path = PUBLIC / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() in {".jpg", ".jpeg"}:
        image.convert("RGB").save(path, quality=quality)
    else:
        image.save(path)
    print(f"  {relative}  {image.size[0]}x{image.size[1]}")


def make_map(size=(811, 746)):
    """Тёмная карта: кварталы и сетка улиц"""
    rng = random.Random(7)
    width, height = size
    image = vertical_gradient(size, (19, 10, 38), (11, 11, 17))
    draw = ImageDraw.Draw(image, "RGBA")

    # Кварталы
    for _ in range(90):
        x = rng.randint(-40, width)
        y = rng.randint(-40, height)
        w = rng.randint(40, 130)
        h = rng.randint(40, 120)
        draw.rounded_rectangle([x, y, x + w, y + h], radius=6, fill=(255, 255, 255, 12))

    # Улицы
    for _ in range(16):
        y = rng.randint(0, height)
        draw.line([(0, y), (width, y)], fill=(255, 255, 255, 38), width=rng.choice([2, 3, 5]))
    for _ in range(14):
        x = rng.randint(0, width)
        draw.line([(x, 0), (x, height)], fill=(255, 255, 255, 38), width=rng.choice([2, 3, 5]))

    # Пара крупных магистралей
    draw.line([(0, height * 0.42), (width, height * 0.36)], fill=(255, 255, 255, 62), width=8)
    draw.line([(width * 0.38, 0), (width * 0.44, height)], fill=(255, 255, 255, 62), width=8)

    image = add_glow(image, (int(width * 0.42), int(height * 0.36)), 220, VIOLET, 0.28)
    return image.filter(ImageFilter.GaussianBlur(0.4))


def diagonal_gradient(size, start, end):
    """Диагональная заливка двумя цветами"""
    width, height = size
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            t = (x / max(width - 1, 1) + y / max(height - 1, 1)) / 2
            pixels[x, y] = tuple(round(start[i] + (end[i] - start[i]) * t) for i in range(3))
    return image


def make_avatar(letter, size, palette, seed):
    """Круглый аватар с буквой на контрастном градиенте"""
    image = diagonal_gradient((size, size), palette[0], palette[1 % len(palette)])
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)

    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype(str(FONT_PATH), int(size * 0.42))
    except OSError:
        font = ImageFont.load_default()

    box = draw.textbbox((0, 0), letter, font=font)
    draw.text(
        ((size - (box[2] - box[0])) / 2 - box[0], (size - (box[3] - box[1])) / 2 - box[1]),
        letter,
        font=font,
        fill=(255, 255, 255, 230),
    )

    output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    output.paste(image, (0, 0), mask)
    return output


def make_device(size, palette, seed, kind):
    """Силуэт устройства со свечением, прозрачный фон"""
    width, height = size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    accent = palette[0]

    if kind == "tower":
        # Системный блок
        body = [width * 0.28, height * 0.12, width * 0.72, height * 0.9]
        draw.rounded_rectangle(body, radius=int(width * 0.05), fill=(22, 22, 30, 255))
        draw.rounded_rectangle(
            [width * 0.33, height * 0.18, width * 0.67, height * 0.55],
            radius=int(width * 0.03),
            fill=(12, 12, 18, 255),
        )
        for i in range(3):
            cy = height * (0.26 + i * 0.12)
            draw.ellipse(
                [width * 0.4, cy - width * 0.06, width * 0.6, cy + width * 0.06],
                outline=accent + (220,),
                width=max(2, int(width * 0.012)),
            )
    elif kind == "machine":
        # Станок
        draw.rounded_rectangle(
            [width * 0.15, height * 0.62, width * 0.85, height * 0.9],
            radius=int(width * 0.04),
            fill=(24, 30, 34, 255),
        )
        draw.rounded_rectangle(
            [width * 0.34, height * 0.16, width * 0.66, height * 0.66],
            radius=int(width * 0.05),
            fill=(20, 26, 30, 255),
        )
        draw.ellipse(
            [width * 0.42, height * 0.28, width * 0.58, height * 0.44],
            outline=accent + (230,),
            width=max(2, int(width * 0.014)),
        )
        draw.rectangle([width * 0.47, height * 0.44, width * 0.53, height * 0.64], fill=accent + (180,))
    else:
        # VR-шлем
        draw.rounded_rectangle(
            [width * 0.12, height * 0.32, width * 0.88, height * 0.68],
            radius=int(height * 0.16),
            fill=(20, 20, 26, 255),
        )
        draw.rounded_rectangle(
            [width * 0.2, height * 0.4, width * 0.8, height * 0.6],
            radius=int(height * 0.09),
            fill=(10, 10, 14, 255),
        )
        for cx in (width * 0.36, width * 0.64):
            draw.ellipse(
                [cx - width * 0.07, height * 0.44, cx + width * 0.07, height * 0.56],
                outline=accent + (230,),
                width=max(2, int(width * 0.01)),
            )

    glow = layer.filter(ImageFilter.GaussianBlur(max(size) * 0.03))
    out = Image.alpha_composite(glow, layer)
    return out


def main():
    print("Генерация заглушек:")

    save(make_map(), "prototype/map.png")
    save(make_device((346, 346), [PURPLE, VIOLET], 11, "tower"), "prototype/rent-computer.png")
    save(make_device((318, 318), [TEAL, BLUE], 12, "machine"), "prototype/use-equipment.png")
    save(make_avatar("A", 128, [PURPLE, BLUE], 21), "prototype/profile.jpg")

    save(abstract((640, 604), [VIOLET, BLUE, TEAL], 31), "institution/kvantorium-1.jpg")
    save(abstract((640, 604), [TEAL, GREEN, BLUE], 32), "institution/center-1.jpg")

    save(make_device((642, 394), [PURPLE, VIOLET], 41, "vr"), "equipment/oculus-rift.jpg")
    save(make_device((642, 394), [TEAL, GREEN], 42, "machine"), "equipment/milling-machine.jpg")
    save(make_device((642, 394), [AMBER, CRIMSON], 43, "machine"), "equipment/3d-printer.jpg")
    save(make_device((642, 394), [BLUE, TEAL], 44, "tower"), "equipment/3d-scanner.jpg")
    save(make_device((642, 394), [GREEN, BLUE], 45, "tower"), "equipment/computer-class.jpg")

    save(abstract((640, 400), [BLUE, VIOLET], 81), "courses/it-cube.jpg")
    save(abstract((640, 400), [PURPLE, TEAL], 82), "courses/vr-ar.jpg")

    save(abstract((588, 360), [GREEN, BLUE], 51), "posts/illusion-of-thinking.jpg")
    save(abstract((588, 360), [AMBER, CRIMSON], 52), "posts/printers-update.jpg")
    save(abstract((588, 360), [PURPLE, BLUE], 53), "posts/vr-guide.jpg")

    save(abstract((324, 524), [PURPLE, CRIMSON], 61), "highlights/anton.jpg")
    save(abstract((324, 524), [TEAL, GREEN], 62), "highlights/masha.jpg")

    save(make_avatar("А", 96, [PURPLE, VIOLET], 71), "avatars/anton.jpg")
    save(make_avatar("М", 96, [TEAL, BLUE], 72), "avatars/masha.jpg")
    save(make_avatar("Д", 96, [GREEN, AMBER], 73), "avatars/dmitry.jpg")

    print("Готово.")


if __name__ == "__main__":
    main()
