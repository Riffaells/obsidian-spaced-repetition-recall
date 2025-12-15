# Flashcard Rule Components

Модульные компоненты для создания и редактирования правил карточек.

## Структура

```
flashcard-rule-components/
├── common.tsx          # Общие настройки (имя, приоритет, теги, scope)
├── inline.tsx          # Настройки inline правил (separator, reverse)
├── header.tsx          # Настройки header правил (levels, limit, content)
├── multiline.tsx       # Настройки multiline правил (pattern, stop condition)
├── cloze.tsx           # Настройки cloze (patterns)
├── index.ts            # Экспорты
├── styles.css          # Стили
└── README.md           # Документация
```

## Компоненты

### common.tsx
Общие настройки для всех типов правил:
- **Name**: Название правила
- **Enabled**: Включено/выключено
- **Priority**: Приоритет (0-100)
- **Tag Pattern**: Паттерн тега (exact/regex режимы)
- **Scope Settings** (collapsible):
  - Ancestor Header Pattern
  - Folder Path Pattern

### inline.tsx
Настройки для inline карточек (`Term :: Definition`):
- **Separator**: Разделитель (по умолчанию `::`)
- **Reverse Separator**: Обратный разделитель (опционально)
- **Start of Line Only**: Только в начале строки

### header.tsx
Настройки для header-based карточек:
- **Selection Settings**:
  - Header Levels (H1-H6 checkboxes)
  - Strict Priority
  - Limit Strategy (none/count/range/random)
- **Content Settings**:
  - Content Scope (full-section/first-paragraph)
  - Include Subheaders
  - Strip Tags

### multiline.tsx
Настройки для multiline карточек:
- **Question Line Pattern**: Regex для определения вопроса
- **Stop Condition**: Условие окончания ответа
  - Blank Line
  - Separator
  - Next Question
  - Custom Pattern

### cloze.tsx
Настройки cloze deletions (для всех типов):
- **Enable Cloze**: Включить обработку cloze
- **Cloze Patterns**: Список regex паттернов (textarea)

## Использование

```typescript
import { FlashcardRuleModal } from "src/gui/modals/FlashcardRuleModal";

// Создание нового правила
const newRule: FlashcardRule = {
    id: `rule-${Date.now()}`,
    name: "",
    enabled: true,
    priority: 0,
    tagPattern: "^#flashcards$",
    type: "inline",
    config: {
        separator: "::",
        startOfLineOnly: false,
    },
};

const modal = new FlashcardRuleModal(
    app,
    newRule,
    async (updatedRule) => {
        // Сохранить правило
        await saveRule(updatedRule);
    },
    () => {
        // Отмена
    },
    false, // isEditMode
);

modal.open();
```

## Модель данных

Все компоненты работают с типами из `src/parser/rule-based/types`:

- `FlashcardRule` - базовый тип (union type)
- `InlineRule` - inline правило
- `HeaderRule` - header правило
- `MultilineRule` - multiline правило
- `RuleMeta` - общие поля
- `InlineConfig`, `HeaderConfig`, `MultilineConfig` - конфигурации
- `ClozeSettings` - настройки cloze

## Извлечение переменных из тегов

Вы можете использовать именованные группы в regex для извлечения переменных из тегов:

### Пример: Динамический уровень заголовка

```json
{
  "tagPattern": "^#flashcards/h(?<level>[1-6])$",
  "type": "header",
  "config": {
    "selection": {
      "levels": [1, 2, 3, 4, 5, 6]
    }
  }
}
```

Когда пользователь использует тег `#flashcards/h3`:
- Regex извлекает `3` в переменную `level`
- HeaderExtractor автоматически фильтрует только заголовки уровня 3
- Результат: создаются карточки только из H3 заголовков

### Другие примеры

**Диапазон уровней:**
```json
{
  "tagPattern": "^#flashcards/h(?<start>[1-6])-h(?<end>[1-6])$"
}
```
Тег `#flashcards/h2-h4` → карточки из H2, H3, H4

**Категории:**
```json
{
  "tagPattern": "^#flashcards/(?<category>\\w+)$"
}
```
Тег `#flashcards/history` → переменная `category = "history"`

## Особенности

1. **Вкладки**: Переключение между типами правил (inline/header/multiline)
2. **Динамические инпуты**: UI адаптируется под выбранные опции
3. **Валидация**: Проверка обязательных полей перед сохранением
4. **Клонирование**: Правило клонируется при открытии модала
5. **Monospace**: Regex инпуты используют моноширинный шрифт
6. **Collapsible**: Scope settings сворачиваются/разворачиваются

## Стилизация

Все стили используют CSS переменные Obsidian для поддержки тем:
- `--text-accent` - акцентный цвет
- `--background-modifier-border` - границы
- `--background-modifier-hover` - hover эффекты
- `--font-monospace` - моноширинный шрифт

## Локализация

Все тексты используют функцию `t()` из `src/lang/helpers` для поддержки множественных языков.
