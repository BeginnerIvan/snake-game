'use strict';

// ─── Чистая логика змейки (без DOM) ──────────────────────────────────────────
// Поле — нижне-левый прямоугольный треугольник: клетка проходима, если она
// внутри поля И ниже-левее гипотенузы (диагональ из левого-верхнего в
// правый-нижний угол), т.е. y >= x.
const COLS = 20;
const ROWS = 20;

function rand(n) { return Math.floor(Math.random() * n); }

function inside(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS && y >= x;
}

/**
 * Возвращает новую голову: голова + направление.
 */
function nextHead(snake, dir) {
  return { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
}

/**
 * true — голова вышла за пределы проходимого поля (стена ИЛИ гипотенуза).
 */
function hitsWall(head) {
  return !inside(head.x, head.y);
}

/**
 * true — голова попадает в тело (учитывает сдвиг хвоста).
 * willGrow = head уже стоит на еде → хвост НЕ срезается.
 */
function hitsBody(head, snake, willGrow) {
  const body = willGrow ? snake : snake.slice(0, -1);
  return body.some(s => s.x === head.x && s.y === head.y);
}

/**
 * true — поворот nd допустим (не разворот на 180°).
 */
function canTurn(nd, dir) {
  return nd.x !== -dir.x || nd.y !== -dir.y;
}

/**
 * Выполняет один шаг змейки. Возвращает { snake, grew, dead }.
 * Не мутирует входной массив.
 */
function step(snake, dir, food) {
  const head = nextHead(snake, dir);

  if (hitsWall(head)) return { snake, grew: false, dead: true };

  const willGrow = head.x === food.x && head.y === food.y;

  if (hitsBody(head, snake, willGrow)) return { snake, grew: false, dead: true };

  const newSnake = [head, ...snake];
  if (!willGrow) newSnake.pop();

  return { snake: newSnake, grew: willGrow, dead: false };
}

/**
 * Ставит еду на случайную свободную клетку ВНУТРИ треугольника.
 */
function placeFood(snake) {
  const free = [];
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (inside(x, y) && !snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
    }
  }
  return free.length ? free[rand(free.length)] : null;
}

// ─── Мини-раннер на node:assert ───────────────────────────────────────────────
const assert = require('assert');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.log(`  [FAIL] ${name}`);
    console.log(`         ${err.message}`);
    failed++;
    failures.push({ name, message: err.message });
  }
}

// ─── Тесты ───────────────────────────────────────────────────────────────────

console.log('\n=== Логика змейки (треугольное поле) — тесты ===\n');

// 1. Обычный шаг вправо (в нижней части треугольника)
test('обычный шаг: голова двигается по направлению', () => {
  const snake = [{ x: 6, y: 15 }, { x: 5, y: 15 }, { x: 4, y: 15 }];
  const dir = { x: 1, y: 0 };
  const food = { x: 0, y: 19 };
  const { snake: ns, dead, grew } = step(snake, dir, food);
  assert.deepStrictEqual(ns[0], { x: 7, y: 15 }, 'новая голова — x+1');
  assert.strictEqual(ns.length, 3, 'длина не изменилась');
  assert.strictEqual(dead, false);
  assert.strictEqual(grew, false);
});

// 2. Хвост исчезает при обычном шаге
test('обычный шаг: хвост срезается', () => {
  const snake = [{ x: 6, y: 15 }, { x: 5, y: 15 }, { x: 4, y: 15 }];
  const dir = { x: 1, y: 0 };
  const food = { x: 0, y: 19 };
  const { snake: ns } = step(snake, dir, food);
  assert.ok(!ns.some(s => s.x === 4 && s.y === 15), 'хвост срезан');
});

// 3. Рост при поедании еды
test('рост: длина увеличивается при поедании еды', () => {
  const snake = [{ x: 6, y: 15 }, { x: 5, y: 15 }, { x: 4, y: 15 }];
  const dir = { x: 1, y: 0 };
  const food = { x: 7, y: 15 }; // прямо перед головой
  const { snake: ns, grew, dead } = step(snake, dir, food);
  assert.strictEqual(grew, true, 'grew должно быть true');
  assert.strictEqual(dead, false);
  assert.strictEqual(ns.length, 4, 'длина выросла на 1');
});

// 4. Рост: старый хвост сохраняется
test('рост: хвост не срезается при поедании еды', () => {
  const snake = [{ x: 6, y: 15 }, { x: 5, y: 15 }, { x: 4, y: 15 }];
  const dir = { x: 1, y: 0 };
  const food = { x: 7, y: 15 };
  const { snake: ns } = step(snake, dir, food);
  assert.ok(ns.some(s => s.x === 4 && s.y === 15), 'хвост {4,15} сохранён');
});

// 5. Столкновение с левой стеной
test('стена: столкновение с левой стеной (x < 0)', () => {
  const snake = [{ x: 0, y: 15 }, { x: 1, y: 15 }];
  const dir = { x: -1, y: 0 };
  const food = { x: 10, y: 19 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true, 'должно быть dead=true');
});

// 6. Столкновение с правым-нижним углом (x >= COLS)
test('стена: столкновение с правой стеной у угла (x >= COLS)', () => {
  const snake = [{ x: 19, y: 19 }, { x: 18, y: 19 }];
  const dir = { x: 1, y: 0 };
  const food = { x: 0, y: 19 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true);
});

// 7. Столкновение с верхней стеной (в вершине, y < 0)
test('стена: столкновение с верхней стеной (y < 0)', () => {
  const snake = [{ x: 0, y: 0 }, { x: 0, y: 1 }];
  const dir = { x: 0, y: -1 };
  const food = { x: 5, y: 19 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true);
});

// 8. Столкновение с нижней стеной (y >= ROWS)
test('стена: столкновение с нижней стеной (y >= ROWS)', () => {
  const snake = [{ x: 5, y: 19 }, { x: 5, y: 18 }];
  const dir = { x: 0, y: 1 };
  const food = { x: 0, y: 19 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true);
});

// 9. Движение вдоль левой стены — не умирает
test('стена: движение вдоль левой стены не убивает', () => {
  const snake = [{ x: 0, y: 5 }, { x: 0, y: 4 }];
  const dir = { x: 0, y: 1 }; // вниз вдоль левого края
  const food = { x: 10, y: 19 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, false);
});

// 9a. Гипотенуза: клетка на диагонали (y == x) проходима
test('диагональ: клетка на гипотенузе (y==x) проходима', () => {
  assert.strictEqual(inside(15, 15), true, '{15,15} на диагонали — внутри');
  assert.strictEqual(inside(0, 0), true, 'вершина {0,0} — внутри');
});

// 9b. Гипотенуза: шаг вправо за диагональ убивает
test('диагональ: шаг вправо за гипотенузу убивает', () => {
  const snake = [{ x: 15, y: 15 }, { x: 14, y: 15 }];
  const dir = { x: 1, y: 0 }; // {16,15}: y(15) < x(16) → вне поля
  const food = { x: 0, y: 19 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true, 'за гипотенузу вправо — смерть');
});

// 9c. Гипотенуза: шаг вверх за диагональ убивает
test('диагональ: шаг вверх за гипотенузу убивает', () => {
  const snake = [{ x: 8, y: 8 }, { x: 8, y: 9 }];
  const dir = { x: 0, y: -1 }; // {8,7}: y(7) < x(8) → вне поля
  const food = { x: 0, y: 19 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true, 'за гипотенузу вверх — смерть');
});

// 10. Столкновение с телом (не с хвостом)
test('себя: столкновение с туловищем (не с хвостом)', () => {
  const snake = [
    { x: 5, y: 15 },
    { x: 5, y: 16 },
    { x: 6, y: 16 },
    { x: 6, y: 15 },
    { x: 6, y: 14 },
  ];
  const dir = { x: 1, y: 0 }; // голова {5,15} → {6,15} — это тело[3]
  const food = { x: 0, y: 19 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true, 'должно быть dead=true при попадании в тело');
});

// 11. Голова идёт в хвост (без роста) — хвост уходит, не умираем
test('себя: голова в хвост без роста — живём (хвост сдвинулся)', () => {
  const snake = [
    { x: 4, y: 15 },
    { x: 4, y: 14 },
    { x: 4, y: 13 },
    { x: 3, y: 13 },
    { x: 3, y: 14 },
    { x: 3, y: 15 }, // ← хвост
  ];
  const dir = { x: -1, y: 0 }; // голова {4,15} → {3,15} = позиция хвоста
  const food = { x: 0, y: 19 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, false, 'голова в хвост без роста — не умираем');
});

// 12. Голова идёт в хвост С ростом — умираем (хвост остаётся на месте)
test('себя: голова в хвост при росте — умираем (хвост не ушёл)', () => {
  const snake = [
    { x: 4, y: 15 },
    { x: 4, y: 14 },
    { x: 4, y: 13 },
    { x: 3, y: 13 },
    { x: 3, y: 14 },
    { x: 3, y: 15 }, // ← хвост
  ];
  const dir = { x: -1, y: 0 };
  const food = { x: 3, y: 15 };  // willGrow=true → хвост не срезается
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true, 'при росте хвост остаётся — должны умереть');
});

// 13-16. Запрет/разрешение поворотов (геометрия поля не влияет)
test('поворот: разворот вправо при движении влево — запрещён', () => {
  assert.strictEqual(canTurn({ x: 1, y: 0 }, { x: -1, y: 0 }), false);
});
test('поворот: разворот вниз при движении вверх — запрещён', () => {
  assert.strictEqual(canTurn({ x: 0, y: 1 }, { x: 0, y: -1 }), false);
});
test('поворот: вправо → вверх — разрешён', () => {
  assert.strictEqual(canTurn({ x: 0, y: -1 }, { x: 1, y: 0 }), true);
});
test('поворот: то же направление — разрешён (не 180°)', () => {
  assert.strictEqual(canTurn({ x: 1, y: 0 }, { x: 1, y: 0 }), true);
});

// 17. placeFood не ставит еду под змеёй — 100 вызовов
test('placeFood: за 100 попыток еда никогда не попадает под змею', () => {
  // змея вдоль нижней стены y=19 (все клетки внутри: 19 >= x)
  const snake = Array.from({ length: 19 }, (_, i) => ({ x: i, y: 19 }));
  for (let i = 0; i < 100; i++) {
    const food = placeFood(snake);
    const hit = snake.some(s => s.x === food.x && s.y === food.y);
    assert.strictEqual(hit, false, `попытка ${i + 1}: еда под змеёй {${food.x},${food.y}}`);
  }
});

// 18. placeFood возвращает клетку ВНУТРИ треугольника
test('placeFood: клетка всегда внутри треугольника', () => {
  const snake = [{ x: 5, y: 15 }];
  for (let i = 0; i < 100; i++) {
    const food = placeFood(snake);
    assert.ok(inside(food.x, food.y), `еда {${food.x},${food.y}} вне треугольника`);
  }
});

// 18a. placeFood возвращает null, когда треугольник заполнен (победа)
test('placeFood: возвращает null при заполненном поле', () => {
  const snake = [];
  for (let x = 0; x < COLS; x++)
    for (let y = 0; y < ROWS; y++)
      if (inside(x, y)) snake.push({ x, y });
  assert.strictEqual(placeFood(snake), null, 'нет свободных клеток → null');
});

// 19. Несколько шагов подряд — корректная цепочка
test('цепочка шагов: 3 шага вправо без смерти', () => {
  let snake = [{ x: 6, y: 15 }, { x: 5, y: 15 }, { x: 4, y: 15 }];
  const dir = { x: 1, y: 0 };
  const food = { x: 0, y: 19 };
  for (let i = 0; i < 3; i++) {
    const res = step(snake, dir, food);
    assert.strictEqual(res.dead, false, `шаг ${i + 1} должен быть живым`);
    snake = res.snake;
  }
  assert.deepStrictEqual(snake[0], { x: 9, y: 15 }, 'голова на {9,15} после 3 шагов');
  assert.strictEqual(snake.length, 3);
});

// 20-21. inside — угловые значения
test('inside: углы треугольника проходимы', () => {
  assert.strictEqual(inside(0, 0), true, 'вершина');
  assert.strictEqual(inside(0, ROWS - 1), true, 'левый-нижний угол');
  assert.strictEqual(inside(COLS - 1, ROWS - 1), true, 'правый-нижний угол');
});

test('inside: вне поля и выше гипотенузы — непроходимо', () => {
  assert.strictEqual(inside(-1, 0), false, 'за левой стеной');
  assert.strictEqual(inside(COLS, 19), false, 'за правой стеной');
  assert.strictEqual(inside(0, -1), false, 'за верхней стеной');
  assert.strictEqual(inside(0, ROWS), false, 'за нижней стеной');
  assert.strictEqual(inside(5, 4), false, 'выше гипотенузы (y < x)');
  assert.strictEqual(inside(19, 0), false, 'верхний-правый угол — вне');
});

// ─── Итог ─────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Итого: ${passed + failed} тестов | Пройдено: ${passed} | Провалено: ${failed}`);
if (failures.length > 0) {
  console.log('\nПровалы:');
  for (const f of failures) {
    console.log(`  [FAIL] ${f.name}`);
    console.log(`         ${f.message}`);
  }
  process.exit(1);
} else {
  console.log('\nВсе тесты прошли.');
  process.exit(0);
}
