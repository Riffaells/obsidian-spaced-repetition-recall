# Анализ и Рекомендации по Системе Парсинга

Этот документ содержит анализ текущей архитектуры парсинга карточек и предложения по её дальнейшему развитию.

## 1. Общая Оценка Архитектуры

Вы проделали отличную работу по переходу к более современной и модульной архитектуре. Система `header-based` парсинга, основанная на `FlashcardTagRule`, — это большой шаг вперед.

### Что работает хорошо:

*   **Новая `header-based` система:** Она отлично спроектирована.
    *   **Модульность:** Разделение логики на `HeadingExtractor`, `HeadingMatcher`, `ContentBoundaryDetector` и `PositionalSelector` делает код чистым и тестируемым.
    *   **`FlashcardTagRule`:** Это ядро новой системы. Модель мощная, декларативная и расширяемая. Возможность определять правила в `data.json` через UI — это именно то, что нужно.
    *   **`RuleResolver`:** Логика слияния правил по приоритетам и обработки паттернов — правильный подход для создания гибкой системы.

### Что требует улучшения:

*   **Легаси-парсер (`parse.ts`):** Это монолитная, сложная для понимания и поддержки функция. Она смешивает логику для `inline`, `multiline` и `cloze` карточек и управляет состоянием в цикле, что чревато ошибками.
*   **Двойственность конфигурации:** Сейчас в системе сосуществуют несколько источников конфигурации:
    1.  Глобальные настройки плагина (`settings.singleLineCardSeparator`, и т.д.).
    2.  Новая система `settings.flashcardTagRules`.
    3.  Старая система `customTags` для `HeaderBasedCardParser`.
    В идеале, **единственным источником правды** должна стать `flashcardTagRules`.
*   **Отсутствие унификации:** Парсеры для `inline`, `multiline` и `cloze` не используют новую систему правил. `NoteQuestionParser` выступает в роли "клея" между старым и новым миром, что усложняет его.

## 2. Что не реализовано и что делать дальше

### A. Завершение перехода на `FlashcardTagRule`

Главная задача — полностью избавиться от легаси-парсера `parse.ts` и перевести все типы карточек на новую систему правил.

**Конкретные шаги:**

1.  **Реализовать `multiline` карточки через правила.**
    *   Добавить `multilineRules` в интерфейс `FlashcardTagRule`.
    *   Создать новый, независимый `RuleBasedMultilineParser`, который работает на основе этих правил.
    *   Интегрировать его в `NoteQuestionParser` и убрать соответствующую логику из `parse.ts`.

2.  **Перевести `inline` и `cloze` карточки на правила.**
    *   По аналогии с `multiline`, создать `RuleBasedInlineParser` и `RuleBasedClozeParser`.
    *   Они должны работать на основе `inlineRules` и (возможно) `clozeRules` в `FlashcardTagRule`.
    *   После этого можно будет полностью удалить `parse.ts`.

### B. Улучшение модели данных (`FlashcardTagRule`)

Ваша модель уже очень хороша. Основное улучшение — сделать её всеобъемлющей.

Я предлагаю расширить `FlashcardTagRule` для поддержки `multiline` карточек и использовать новую структуру без поля `source`:

```typescript
// in src/parser/header-based/types.ts

export interface FlashcardTagRule {
    id: RuleId;
    name: string;
    enabled: boolean;
    priority: number;

    // Matching Strategy
    tagExact?: string;
    tagPattern?: string;
    patternFlags?: string;

    // --- Rules for different card types ---
    // The presence of a section indicates the rule type
    headerRules?: {
        headingLevels: number[];
        nestingMode: "nested" | "flat";
        selectors: PositionalSelector[];
        includeParents: number;
        cardMode: "qa" | "all" | "cloze" | "visual";
        qaSeparator?: string;
    };
    
    inlineRules?: {
        separator: string;
    };

    multilineRules?: {
        separator: string;
        reversedSeparator: string;
        endMarker?: string; // Optional
    };
}
```

Это позволит настраивать `multiline` карточки так же гибко, как и `header-based`.

### C. Реализация вложенных/цепных селекторов

Ваша идея `flashcards/h1/last-3/h2` — это мощная концепция **вложенного выбора**. Текущая система применяет селекторы к общему списку заголовков. Вам же нужна возможность сначала выбрать "контейнеры" (последние 3 `h1`), а затем уже внутри них искать `h2`.

Это продвинутая функция. Её можно реализовать, расширив `headerRules`:

```typescript
// Proposal for future implementation
headerRules?: {
    // ... existing fields
    
    // NEW: Defines a scope for the search
    selectionScope?: {
        scopeLevel: number; // e.g., 1 for h1
        selector: PositionalSelector; // e.g., { type: "last", count: 3 }
    };
    
    // `headingLevels` would then apply within each found scope
    headingLevels: number[]; // e.g., [2] for h2
};
```

**Рекомендация:** Сначала завершите переход на rule-based парсинг для всех типов карточек, а затем приступайте к реализации вложенных селекторов, так как это потребует значительного усложнения логики `HeaderBasedCardParser`.

## 3. Итог

Вы на правильном пути. Унификация системы парсинга вокруг `FlashcardTagRule` — ключевая задача. Это сделает плагин намного более мощным, гибким и простым в поддержке.

**Приоритеты:**
1.  **Реализовать `multiline` карточки на основе правил.**
2.  Перевести `inline` и `cloze` на правила.
3.  Полностью удалить `parse.ts`.
4.  Приступить к реализации вложенных селекторов.
