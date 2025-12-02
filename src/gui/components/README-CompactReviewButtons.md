# Compact Review Buttons

Компактные кнопки для быстрого повторения заметок с иконками фруктов.

## Функциональность

### Кнопки
- ❌ **X-Circle (Красная)** - Hard/Плохо - Сложно запомнить (клавиша `1`)
- ➖ **Minus-Circle (Желтая)** - Good/Нормально - Нормально запомнил (клавиша `2`)
- ✅ **Check-Circle (Зелёная)** - Easy/Отлично - Легко запомнил (клавиша `3`)

### Особенности
- ✅ Компактный дизайн в одну строку
- ✅ Сворачиваемые кнопки (chevron влево/вправо, всегда видна)
- ✅ Показываются только для заметок, которые нужно повторить
- ✅ Автоматически скрываются после повторения
- ✅ Неоновый стиль с эффектами свечения
- ✅ Иконки Obsidian (x-circle, minus-circle, check-circle)
- ✅ Автоматическое обновление Sidebar после повторения
- ✅ Адаптивный дизайн для мобильных устройств
- ✅ Поддержка темной и светлой темы

### Новые функции
- ⌨️ **Горячие клавиши**: 1 (Hard), 2 (Good), 3 (Easy)
- 📍 **Настройка позиции**: top-right, top-left, bottom-right, bottom-left
- 👻 **Автоскрытие**: Кнопки исчезают после N секунд неактивности
- 🔢 **Счётчик**: Показывает количество оставшихся заметок
- ↩️ **Undo**: Ctrl+Z для отмены (в течение 5 секунд)
- 📊 **Интервал при hover**: Показывает следующий интервал повторения

## Использование

### Базовое использование

```typescript
import { CompactReviewButtons } from "src/gui/components/CompactReviewButtons";
import { ReviewResponse } from "src/scheduling";

// Создать кнопки
const buttons = new CompactReviewButtons(containerEl, {
    onReview: (response: ReviewResponse) => {
        console.log("Review response:", response);
        // Обработать ответ
    },
    initialCollapsed: false,
    showLabels: true,
});

// Показать/скрыть
buttons.show();
buttons.hide();

// Свернуть/развернуть
buttons.setCollapsed(true);

// Уничтожить
buttons.destroy();
```

### Интеграция с заметками

Интеграция уже реализована в `main.ts`:

```typescript
// Инициализация в onload()
this.noteReviewManager = new NoteReviewButtonsManager(this);

// Автоматическое добавление кнопок при смене активной заметки
this.registerEvent(
    this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf && this.data.settings.showCompactReviewButtons) {
            this.noteReviewManager.addButtonsToNote(leaf);
        }
    })
);

// Обновление кнопок после повторения
this.registerEvent(
    this.app.workspace.on("sr:note-reviewed", () => {
        this.noteReviewManager.refreshAllButtons();
    })
);

// Очистка в onunload()
if (this.noteReviewManager) {
    this.noteReviewManager.destroy();
}
```

## Настройки

В `settings.ts`:

```typescript
interface SRSettings {
    // ...
    showCompactReviewButtons: boolean;      // Показывать кнопки (по умолчанию: true)
    compactReviewButtonsCollapsed?: boolean; // Свернуты по умолчанию (по умолчанию: false)
}
```

Настройки доступны в GUI:
- **Settings → Notes → Show Compact Review Buttons** - включить/выключить кнопки
- **Settings → Notes → Collapse Buttons by Default** - сворачивать кнопки по умолчанию (видна только если кнопки включены)

## Стили

Все стили находятся в `styles.css`:

- `.sr-compact-review-container` - Контейнер
- `.sr-compact-review-buttons` - Кнопки
- `.sr-compact-btn-hard` - Красная кнопка (Hard)
- `.sr-compact-btn-good` - Желтая кнопка (Good)
- `.sr-compact-btn-easy` - Зеленая кнопка (Easy)
- `.sr-note-review-banner` - Баннер в заметке

## Архитектура

```
CompactReviewButtons (UI компонент)
    ↓
NoteReviewButtonsManager (Менеджер интеграции)
    ↓
IReviewNote (Система повторения)
    ↓
DataStore (Хранилище данных)
```

## События

- `sr:note-reviewed` - Триггерится после повторения заметки

## Примеры

### Пример 1: Базовые кнопки
```typescript
const buttons = new CompactReviewButtons(el, {
    onReview: (response) => handleReview(response),
});
```

### Пример 2: Свернутые кнопки без меток
```typescript
const buttons = new CompactReviewButtons(el, {
    onReview: (response) => handleReview(response),
    initialCollapsed: true,
    showLabels: false,
});
```

### Пример 3: С обработчиком сворачивания
```typescript
const buttons = new CompactReviewButtons(el, {
    onReview: (response) => handleReview(response),
    onToggle: (collapsed) => {
        console.log("Buttons collapsed:", collapsed);
        savePreference("collapsed", collapsed);
    },
});
```

## Тестирование

```typescript
// Проверить, что кнопки создаются
const buttons = new CompactReviewButtons(el, { onReview: jest.fn() });
expect(el.querySelector(".sr-compact-review-buttons")).toBeTruthy();

// Проверить клик
const hardBtn = el.querySelector(".sr-compact-btn-hard");
hardBtn.click();
expect(onReview).toHaveBeenCalledWith(ReviewResponse.Hard);
```

## Будущие улучшения

- [ ] Кастомизация иконок через настройки
- [ ] Анимация при клике
- [ ] Звуковые эффекты (опционально)
- [ ] Статистика использования кнопок
- [ ] Горячие клавиши (1, 2, 3)
