'use strict';

// ─── Чистая логика змейки (без DOM) ──────────────────────────────────────────
const COLS = 20;
const ROWS = 20;

function rand(n) { return Math.floor(Math.random() * n); }

/**
 * Возвращает новую голову: голова + направление.
 */
function nextHead(snake, dir) {
  return { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
}

/**
 * true — голова вышла за границы поля.
 */
function hitsWall(head) {
  return head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
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
 * Выполняет один шаг змейки. Возвращает:
 *   { snake, grew, dead }
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
 * Ставит еду на случайную свободную клетку.
 */
function placeFood(snake) {
  let cell;
  let attempts = 0;
  do {
    cell = { x: rand(COLS), y: rand(ROWS) };
    attempts++;
    if (attempts > COLS * ROWS * 2) throw new Error('no free cell');
  } while (snake.some(s => s.x === cell.x && s.y === cell.y));
  return cell;
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

console.log('\n=== Логика змейки — тесты ===\n');

// 1. Обычный шаг вправо
test('обычный шаг: голова двигается по направлению', () => {
  const snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  const dir = { x: 1, y: 0 };
  const food = { x: 0, y: 0 };
  const { snake: ns, dead, grew } = step(snake, dir, food);
  assert.deepStrictEqual(ns[0], { x: 6, y: 5 }, 'новая голова — x+1');
  assert.strictEqual(ns.length, 3, 'длина не изменилась');
  assert.strictEqual(dead, false);
  assert.strictEqual(grew, false);
});

// 2. Хвост исчезает при обычном шаге
test('обычный шаг: хвост срезается', () => {
  const snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  const dir = { x: 1, y: 0 };
  const food = { x: 0, y: 0 };
  const { snake: ns } = step(snake, dir, food);
  // старый хвост {3,5} не должен присутствовать
  assert.ok(!ns.some(s => s.x === 3 && s.y === 5), 'хвост срезан');
});

// 3. Рост при поедании еды
test('рост: длина увеличивается при поедании еды', () => {
  const snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  const dir = { x: 1, y: 0 };
  const food = { x: 6, y: 5 }; // прямо перед головой
  const { snake: ns, grew, dead } = step(snake, dir, food);
  assert.strictEqual(grew, true, 'grew должно быть true');
  assert.strictEqual(dead, false);
  assert.strictEqual(ns.length, 4, 'длина выросла на 1');
});

// 4. Рост: старый хвост сохраняется
test('рост: хвост не срезается при поедании еды', () => {
  const snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  const dir = { x: 1, y: 0 };
  const food = { x: 6, y: 5 };
  const { snake: ns } = step(snake, dir, food);
  assert.ok(ns.some(s => s.x === 3 && s.y === 5), 'хвост {3,5} сохранён');
});

// 5. Столкновение с левой стеной
test('стена: столкновение с левой стеной (x < 0)', () => {
  const snake = [{ x: 0, y: 5 }, { x: 1, y: 5 }];
  const dir = { x: -1, y: 0 };
  const food = { x: 10, y: 10 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true, 'должно быть dead=true');
});

// 6. Столкновение с правой стеной
test('стена: столкновение с правой стеной (x >= COLS)', () => {
  const snake = [{ x: 19, y: 5 }, { x: 18, y: 5 }];
  const dir = { x: 1, y: 0 };
  const food = { x: 0, y: 0 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true);
});

// 7. Столкновение с верхней стеной
test('стена: столкновение с верхней стеной (y < 0)', () => {
  const snake = [{ x: 5, y: 0 }, { x: 5, y: 1 }];
  const dir = { x: 0, y: -1 };
  const food = { x: 0, y: 0 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true);
});

// 8. Столкновение с нижней стеной
test('стена: столкновение с нижней стеной (y >= ROWS)', () => {
  const snake = [{ x: 5, y: 19 }, { x: 5, y: 18 }];
  const dir = { x: 0, y: 1 };
  const food = { x: 0, y: 0 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true);
});

// 9. Змея у стены, но идёт вдоль — не умирает
test('стена: движение вдоль стены не убивает', () => {
  const snake = [{ x: 0, y: 5 }, { x: 0, y: 4 }];
  const dir = { x: 0, y: 1 }; // вниз вдоль левого края
  const food = { x: 10, y: 10 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, false);
});

// 10. Столкновение с телом (не с хвостом)
test('себя: столкновение с туловищем (не с хвостом)', () => {
  // змея свёрнута: голова идёт в клетку тела
  const snake = [
    { x: 5, y: 5 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 6, y: 5 },
    { x: 6, y: 4 },
  ];
  const dir = { x: 1, y: 0 }; // голова {5,5} + {1,0} = {6,5} — это тело[3]
  const food = { x: 0, y: 0 };
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true, 'должно быть dead=true при попадании в тело');
});

// 11. Голова идёт в хвост (без роста) — хвост уходит, не умираем
test('себя: голова в хвост без роста — живём (хвост сдвинулся)', () => {
  // Хвост на {3,5}, голова на {5,5} идёт влево... не прямо в хвост.
  // Строим конкретный случай: голова {4,5}, хвост {3,5}, dir = {-1,0}
  // голова пойдёт в {3,5} = позиция хвоста, но хвост уйдёт — живём.
  const snake = [
    { x: 4, y: 5 },
    { x: 4, y: 4 },
    { x: 3, y: 4 },
    { x: 3, y: 5 }, // ← хвост
  ];
  const dir = { x: 0, y: 0 }; // нам нужно голова → {3,5}
  // Перестроим: голова {4,5}, двигаемся влево, хвост {3,5}
  const snake2 = [
    { x: 4, y: 5 },
    { x: 4, y: 4 },
    { x: 4, y: 3 },
    { x: 3, y: 3 },
    { x: 3, y: 4 },
    { x: 3, y: 5 }, // ← хвост
  ];
  const dir2 = { x: -1, y: 0 }; // голова {4,5} → {3,5} = позиция хвоста
  const food2 = { x: 0, y: 0 };
  const { dead } = step(snake2, dir2, food2);
  assert.strictEqual(dead, false, 'голова в хвост без роста — не умираем');
});

// 12. Голова идёт в хвост С ростом — умираем (хвост остаётся на месте)
test('себя: голова в хвост при росте — умираем (хвост не ушёл)', () => {
  // еда ровно перед головой (= будущая позиция = позиция хвоста)
  const snake = [
    { x: 4, y: 5 },
    { x: 4, y: 4 },
    { x: 4, y: 3 },
    { x: 3, y: 3 },
    { x: 3, y: 4 },
    { x: 3, y: 5 }, // ← хвост
  ];
  const dir = { x: -1, y: 0 }; // голова {4,5} → {3,5} = позиция хвоста
  const food = { x: 3, y: 5 };  // еда прямо там → willGrow=true → хвост не срезается
  const { dead } = step(snake, dir, food);
  assert.strictEqual(dead, true, 'при росте хвост остаётся — должны умереть');
});

// 13. Запрет разворота на 180° — вправо при движении влево
test('поворот: разворот вправо при движении влево — запрещён', () => {
  const dir = { x: -1, y: 0 };
  const nd  = { x: 1, y: 0 };
  assert.strictEqual(canTurn(nd, dir), false, 'разворот на 180° запрещён');
});

// 14. Запрет разворота вниз при движении вверх
test('поворот: разворот вниз при движении вверх — запрещён', () => {
  const dir = { x: 0, y: -1 };
  const nd  = { x: 0, y: 1 };
  assert.strictEqual(canTurn(nd, dir), false);
});

// 15. Разрешённый поворот: вправо → вверх
test('поворот: вправо → вверх — разрешён', () => {
  const dir = { x: 1, y: 0 };
  const nd  = { x: 0, y: -1 };
  assert.strictEqual(canTurn(nd, dir), true);
});

// 16. Разрешённый поворот: тот же dir
test('поворот: то же направление — разрешён (не 180°)', () => {
  const dir = { x: 1, y: 0 };
  assert.strictEqual(canTurn(dir, dir), true, 'прямо — всегда разрешено');
});

// 17. placeFood не ставит еду под змеёй — 100 вызовов
test('placeFood: за 100 попыток еда никогда не попадает под змею', () => {
  // Змея занимает всю первую строку 0..18 (19 клеток), оставляем x=19 свободным
  const snake = Array.from({ length: 19 }, (_, i) => ({ x: i, y: 0 }));
  for (let i = 0; i < 100; i++) {
    const food = placeFood(snake);
    const hit = snake.some(s => s.x === food.x && s.y === food.y);
    assert.strictEqual(hit, false, `попытка ${i + 1}: еда под змеёй {${food.x},${food.y}}`);
  }
});

// 18. placeFood возвращает клетку в границах поля
test('placeFood: клетка всегда в границах поля', () => {
  const snake = [{ x: 5, y: 5 }];
  for (let i = 0; i < 100; i++) {
    const food = placeFood(snake);
    assert.ok(food.x >= 0 && food.x < COLS, `x=${food.x} вне поля`);
    assert.ok(food.y >= 0 && food.y < ROWS, `y=${food.y} вне поля`);
  }
});

// 19. Несколько шагов подряд — корректная цепочка
test('цепочка шагов: 3 шага вправо без смерти', () => {
  let snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  const dir = { x: 1, y: 0 };
  const food = { x: 0, y: 0 };
  for (let i = 0; i < 3; i++) {
    const res = step(snake, dir, food);
    assert.strictEqual(res.dead, false, `шаг ${i + 1} должен быть живым`);
    snake = res.snake;
  }
  assert.deepStrictEqual(snake[0], { x: 8, y: 5 }, 'голова на {8,5} после 3 шагов');
  assert.strictEqual(snake.length, 3);
});

// 20. hitsWall — угловые значения (ровно на границе)
test('hitsWall: значения ровно на границе (0,0) — не умираем', () => {
  assert.strictEqual(hitsWall({ x: 0, y: 0 }), false);
  assert.strictEqual(hitsWall({ x: COLS - 1, y: ROWS - 1 }), false);
});

test('hitsWall: значения за границей — умираем', () => {
  assert.strictEqual(hitsWall({ x: -1, y: 0 }), true);
  assert.strictEqual(hitsWall({ x: COLS, y: 0 }), true);
  assert.strictEqual(hitsWall({ x: 0, y: -1 }), true);
  assert.strictEqual(hitsWall({ x: 0, y: ROWS }), true);
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
