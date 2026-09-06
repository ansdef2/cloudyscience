# Маршруты приложения

Next.js App Router, все страницы лежат в `src/app`, вёрстка — в `src/screens`.

| Маршрут | Экран | Что показывает |
|---|---|---|
| `/` | `HomePage` | Карта, поиск, карточки аренды, свободные места на курсы, «Актуальное» и лента постов |
| `/search` | `SearchPage` | Поиск с общей выдачей: учреждения, курсы, оборудование и специалисты |
| `/equipment` | `EquipmentCatalog` | Каталог оборудования с поиском и фильтром по типу (`?type=`) |
| `/equipment/[id]` | `EquipmentDetail` | Карточка оборудования: переключатель 3D/JPG и таблица характеристик по разделам |
| `/booking/[equipmentId]` | `BookingPage` | Бронирование в три шага: файлы и тип аренды, дата и время, подтверждение |
| `/institution/[id]` | `InstitutionDetail` | Карточка учреждения с контактами и направлениями обучения |
| `/course/[id]` | `CourseDetail` | Карточка направления и запись на консультацию |
| `/login` | `Login` | Вход |
| `/register` | `Register` | Регистрация |

## Переходы

- `/` → `/search` (поле поиска), `/equipment` (карточки аренды), `/course/[id]` (карусель курсов)
- `/search` → `/institution/[id]`, `/course/[id]`, `/equipment/[id]`, `/booking/[id]`
- `/equipment` → `/equipment/[id]`, `/booking/[id]`
- `/equipment/[id]` → `/booking/[equipmentId]`
- `/institution/[id]` → `/course/[id]`
- `/login` ↔ `/register`

## Дизайн

Все экраны используют дизайн-систему прототипа: токены из `src/styles/prototype.css`,
общие `ProtoTopBar`, `ProtoSearchField`, `ProtoCalendar`. Экранов на старом дизайне
не осталось.
