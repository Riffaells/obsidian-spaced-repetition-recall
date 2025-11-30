# Unified Flashcard Tag Rules System

## Overview

Новая унифицированная система правил для карточек объединяет inline и header-based карточки в единую, гибкую и сериализуемую модель.

## Ключевые принципы

1. **Полная сериализуемость** - никаких RegExp объектов, только строки
2. **Приоритеты** - явное разрешение конфликтов через priority
3. **Гибкие селекторы** - точное позиционирование заголовков
4. **Детерминированное слияние** - предсказуемый алгоритм merge

## Типы

### FlashcardTagRule

Основное правило конфигурации (хранится в data.json):

```typescript
interface FlashcardTagRule {
    id: RuleId;                    // Уникальный идентификатор
    name: string;                  // Для UI
    enabled: boolean;
    priority: number;              // 0 = default, 100 = override
    
    // Matching Strategy
    tagExact?: string;             // "#flashcards/exam"
    tagPattern?: string;           // "^#flashcards/.*"
    patternFlags?: string;         // "i"
    
    // Content Extraction
    source: "header" | "inline" | "multiline";
    
    headerRules?: {
        headingLevels: number[];
        nestingMode: "nested" | "flat";
        selectors: PositionalSelector[];
        includeParents: number;
        cardMode: "qa" | "cloze" | "visual";
        qaSeparator?: string;
    };
    
    inlineRules?: {
        separator: string;
    };
}
```

### PositionalSelector

Позиционные селекторы для точного выбора заголовков:

```typescript
type PositionalSelector =
    | { type: "first"; count: number }          // Первые N
    | { type: "last"; count: number }           // Последние N
    | { type: "nth"; index: number }            // nth (1-based)
    | { type: "nthFromEnd"; offset: number };   // offset от конца (0 = last)
```

**Примеры:**
- `{ type: "first", count: 3 }` - первые 3 заголовка
- `{ type: "last", count: 2 }` - последние 2 заголовка
- `{ type: "nth", index: 5 }` - 5-й заголовок (1-based)
- `{ type: "nthFromEnd", offset: 0 }` - последний заголовок
- `{ type: "nthFromEnd", offset: 1 }` - второй с конца

### ResolvedHeaderConfig

Итоговая конфигурация после слияния правил:

```typescript
interface ResolvedHeaderConfig {
    ruleIds: RuleId[];
    nestingMode: "nested" | "flat";
    cardMode: "qa" | "cloze" | "visual";
    includeParents: number;
    qaSeparator: string;
}
```

## Алгоритм слияния правил

При наличии нескольких подходящих правил:

1. **Collect** - собрать все matching rules
2. **Filter** - только enabled === true
3. **Sort** - по priority (descending)
4. **Merge** по полям:
   - `headingLevels` - union (unique, sorted)
   - `mode` - последний по priority
   - `nestingMode` - последний по priority
   - `selectors` - concatenate (OR filters)
   - `qaSeparator` - highest priority wins
   - `includeParents` - max()

## Примеры использования

### Пример 1: Простое inline правило

```typescript
{
    id: "default-flashcards",
    name: "Default Flashcards",
    tagExact: "#flashcards",
    enabled: true,
    priority: 0,
    source: "inline",
    inlineRules: {
        separator: "::"
    }
}
```

### Пример 2: Header-based с уровнем

```typescript
{
    id: "exam-h2",
    name: "Exam Questions (H2)",
    tagExact: "#exam/h2",
    enabled: true,
    priority: 0,
    source: "header",
    headerRules: {
        headingLevels: [2],
        nestingMode: "nested",
        selectors: [],
        includeParents: 1,
        cardMode: "qa",
        qaSeparator: "?"
    }
}
```

### Пример 3: Последние 2 заголовка

```typescript
{
    id: "study-last-2",
    name: "Study Last 2",
    tagExact: "#study/last-2",
    enabled: true,
    priority: 0,
    source: "header",
    headerRules: {
        headingLevels: [2, 3],
        nestingMode: "flat",
        selectors: [
            { type: "last", count: 2 }
        ],
        includeParents: 0,
        cardMode: "visual",
        qaSeparator: "?"
    }
}
```

### Пример 4: Regex pattern

```typescript
{
    id: "vocab-pattern",
    name: "Vocabulary Cards",
    tagPattern: "^#(vocab|словарь)(/.*)?$",
    patternFlags: "i",
    enabled: true,
    priority: 10,
    source: "header",
    headerRules: {
        headingLevels: [3],
        nestingMode: "flat",
        selectors: [],
        includeParents: 2,
        cardMode: "qa",
        qaSeparator: "—"
    }
}
```

## Миграция

Старые настройки автоматически мигрируются:

- `flashcardTags: ["#flashcards"]` → inline rule
- `headerCardCustomTags` → header rules с соответствующими параметрами
- `headerCardShowContext` → `includeParents: 1`

## API

### RuleResolver

Класс для работы с правилами:

```typescript
const resolver = new RuleResolver(rules);

// Найти подходящие правила
const matching = resolver.findMatchingRules("#exam/h2");

// Слить правила
const config = resolver.mergeRules(["#exam", "#study"]);

// Получить уровни заголовков
const levels = resolver.getHeadingLevels(["#exam"]);

// Получить селекторы
const selectors = resolver.getPositionalSelectors(["#exam"]);
```

### Validation

```typescript
import { validateRule } from "./ruleResolver";

const errors = validateRule(rule);
if (errors.length > 0) {
    console.error("Invalid rule:", errors);
}
```

## Рекомендации по парсингу

1. **Используйте AST** (remark/markdown-it) для корректного определения заголовков
2. **Игнорируйте** заголовки внутри code blocks, blockquotes
3. **Кэшируйте** результаты AST между сохранениями
4. **Применяйте** positional selectors после фильтрации по уровням
5. **Логируйте** конфликты при слиянии правил

## TODO

- [ ] UI для управления правилами (CRUD)
- [ ] Тестовая кнопка для проверки pattern на текущем файле
- [ ] Предупреждение при удалении правила (N карточек будут удалены)
- [ ] Визуализация приоритетов и конфликтов
- [ ] Экспорт/импорт правил
