'use strict';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const restartBtn = document.getElementById('restart');

const CELL = 20;                          // размер клетки в пикселях
const COLS = canvas.width / CELL;         // 20 клеток по ширине
const ROWS = canvas.height / CELL;        // 20 клеток по высоте
const TICK = 110;                         // мс между шагами

let snake, dir, nextDir, food, score, best, running, paused, timer;

best = Number(localStorage.getItem('snake-best') || 0);
bestEl.textContent = best;

function reset() {
  snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
  dir = { x: 1, y: 0 };
  nextDir = dir;
  score = 0;
  scoreEl.textContent = score;
  placeFood();
  paused = false;
  running = true;
  overlay.classList.add('hidden');
  clearInterval(timer);
  timer = setInterval(tick, TICK);
}

function placeFood() {
  // ищем свободную клетку, не занятую змейкой
  let cell;
  do {
    cell = { x: rand(COLS), y: rand(ROWS) };
  } while (snake.some(s => s.x === cell.x && s.y === cell.y));
  food = cell;
}

function rand(n) { return Math.floor(Math.random() * n); }

function tick() {
  if (paused) return;

  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // столкновение со стеной
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return gameOver();
  }
  // столкновение с собой
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return gameOver();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem('snake-best', best);
    }
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // еда
  ctx.fillStyle = '#f87171';
  ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);

  // змейка
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#4ade80' : '#22c55e';
    ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
  });
}

function gameOver() {
  running = false;
  clearInterval(timer);
  overlayText.textContent = 'Игра окончена · Счёт ' + score;
  overlay.classList.remove('hidden');
}

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();

  if (k === ' ') {
    if (running) paused = !paused;
    e.preventDefault();
    return;
  }

  let nd = null;
  if (k === 'arrowup' || k === 'w') nd = { x: 0, y: -1 };
  else if (k === 'arrowdown' || k === 's') nd = { x: 0, y: 1 };
  else if (k === 'arrowleft' || k === 'a') nd = { x: -1, y: 0 };
  else if (k === 'arrowright' || k === 'd') nd = { x: 1, y: 0 };

  if (nd) {
    e.preventDefault();
    // нельзя развернуться на 180°
    if (nd.x !== -dir.x || nd.y !== -dir.y) nextDir = nd;
  }
});

restartBtn.addEventListener('click', reset);

reset();
