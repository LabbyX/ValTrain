# ValTrain

Журнал тренировок и матчей для **Valorant**: подходы на тренировках, настройки мыши, рейтинговые игры и отчёты — всё работает в браузере, данные хранятся **локально** (IndexedDB).

---

## Возможности

| Раздел | Описание |
|--------|----------|
| **Тренировка** | «100 ботов» с последовательными подходами, сложные боты (сложность + результат из 30), Deathmatch (kills/deaths, оружие), фильтр по датам, графики и краткие наблюдения |
| **Настройки** | DPI, чувствительность прицела, множители scoped и ADS — слайдеры и точный ввод с клавиатуры, eDPI |
| **Рейтинговые** | Карты с превью из `public/img/`, K/D/A, **счёт матча** (подсветка победа / поражение / ничья), история |
| **Общий итог** | Сводка за период, рекомендации, карты по K/D, те же графики тренировок |

Дополнительно: **светлая и тёмная тема** с плавным переключением, оформление в духе тактического минимализма Valorant.

---

## Схема работы (IDEF-подобная декомпозиция)

Ниже — двухуровневая логика в духе **IDEF0**: сначала контекст «кто с чем взаимодействует», затем разбиение приложения на навигацию, экраны, визуализацию и хранение данных. Диаграммы на [Mermaid](https://mermaid.js.org/) — на GitHub они отображаются прямо в файле.

### Уровень A-0: контекст системы

```mermaid
%%{init: {'theme':'base', 'themeVariables': {'primaryColor':'#1a222d','primaryTextColor':'#ece8e1','primaryBorderColor':'#ff4656','lineColor':'#8b949e','secondaryColor':'#161c24','tertiaryColor':'#0f1419'}}}%%
flowchart LR
  classDef actor fill:#ff465633,stroke:#ff4656,stroke-width:2px,color:#ece8e1
  classDef system fill:#161c24,stroke:#0fffd5,stroke-width:2px,color:#ece8e1
  classDef store fill:#0f1419,stroke:#ff4656,stroke-width:2px,color:#ece8e1

  U([Игрок]):::actor
  V[[ValTrain<br/>SPA в браузере]]:::system
  L[(Локальные данные<br/>IndexedDB)]:::store
  F[/Картинки карт<br/>public/img/]:::system

  U <-->|UI · ввод и просмотр| V
  V <-->|чтение и запись| L
  V -->|загрузка превью| F
```

### Уровень A1: декомпозиция приложения

```mermaid
%%{init: {'theme':'base', 'themeVariables': {'primaryColor':'#1a222d','primaryTextColor':'#ece8e1','primaryBorderColor':'#ff4656','lineColor':'#8b949e','secondaryColor':'#161c24','tertiaryColor':'#0f1419'}}}%%
flowchart TB
  classDef shell fill:#161c24,stroke:#ff4656,color:#ece8e1
  classDef page fill:#1a222d,stroke:#0fffd5,color:#ece8e1
  classDef data fill:#0f1419,stroke:#ff4656,color:#ece8e1
  classDef lib fill:#161c24,stroke:#8b949e,color:#ece8e1

  subgraph nav["Оболочка и навигация"]
    RR[React Router]:::shell
    LO[Layout · тема светлая/тёмная]:::shell
  end

  subgraph screens["Экраны"]
    PG1[Главная · hub]:::page
    PG2[Тренировка · журнал и графики]:::page
    PG3[Настройки мыши · DPI и сенса]:::page
    PG4[Рейтинговые · карты и счёт]:::page
    PG5[Общий итог · сводка и советы]:::page
  end

  subgraph viz["Визуализация"]
    CH[Recharts · линии и столбцы]:::lib
  end

  subgraph persist["Персистентность"]
    DX[Dexie.js · ORM поверх IndexedDB]:::data
    TB1[(training)]:::data
    TB2[(settings)]:::data
    TB3[(ranked)]:::data
    DX --> TB1 & TB2 & TB3
  end

  RR --> LO
  LO --> PG1 & PG2 & PG3 & PG4 & PG5
  PG2 --> CH
  PG5 --> CH
  PG1 & PG2 & PG3 & PG4 & PG5 --> DX
```

### Поток данных при сохранении записи

```mermaid
%%{init: {'theme':'base', 'themeVariables': {'primaryColor':'#1a222d','primaryTextColor':'#ece8e1','primaryBorderColor':'#ff4656','lineColor':'#8b949e'}}}%%
sequenceDiagram
  autonumber
  participant U as Пользователь
  participant P as Страница React
  participant D as Dexie
  participant I as IndexedDB

  U->>P: Заполняет форму и сохраняет
  P->>D: put / add объект записи
  D->>I: транзакция в таблицу
  I-->>D: OK
  D-->>P: подтверждение
  P-->>U: Обновлённый журнал и графики
```

---

## Быстрый старт

Требуется **Node.js** 18+ и npm.

```bash
git clone https://github.com/LabbyX/ValTrain.git
cd ValTrain
npm install
npm run dev
```

Откройте в браузере адрес из терминала (обычно `http://localhost:5173`).

### Сборка для продакшена

```bash
npm run build
npm run preview
```

Папка **`dist/`** — статика для любого хостинга (GitHub Pages, Netlify, Vercel и т.д.).

---

## Картинки карт

Файлы лежат в **`public/img/`**. Пути задаются в [`src/data/valorant.ts`](src/data/valorant.ts) в поле `image` (например `/img/ascent.jpg`). Имя и расширение должны совпадать с реальным файлом.

---

## Стек

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- [Dexie.js](https://dexie.org/) (IndexedDB)
- [Recharts](https://recharts.org/)

---

## Данные и приватность

Все записи тренировок, настройки и рейтинговые строки хранятся **только на вашем устройстве** в браузере. Очистка данных сайта или другой браузер означает пустую базу — при необходимости делайте резервные копии вручную (экспорт в приложении можно добавить отдельно).

---

## Лицензия

MIT — см. файл [`LICENSE`](LICENSE).

---

<p align="center">
  <sub>Не связано с Riot Games. Valorant — торговая марка Riot Games, Inc.</sub>
</p>
