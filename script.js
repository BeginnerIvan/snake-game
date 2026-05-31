'use strict';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const restartBtn = document.getElementById('restart');
const muteBtn = document.getElementById('mute');

const CELL = 20;                          // размер клетки в пикселях
const COLS = canvas.width / CELL;         // 20 клеток по ширине
const ROWS = canvas.height / CELL;        // 20 клеток по высоте
const TICK = 110;                         // мс между шагами логики

let snake;        // массив клеток-сегментов {x, y}, snake[0] — голова
let prevSnake;    // позиции сегментов на прошлом шаге (для интерполяции)
let dir, nextDir, food, score, best, running, paused;
let lastStep;     // время последнего шага логики (мс)

best = Number(localStorage.getItem('snake-best') || 0);
bestEl.textContent = best;

// ---------- Звук (Web Audio, синтез на лету) ----------
let audioCtx = null;
let muted = localStorage.getItem('snake-muted') === '1';
updateMuteBtn();

function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

// beep: частота от start к end за длительность dur, тип волны
function beep(start, end, dur, type = 'square', vol = 0.15) {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(start, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

function soundEat()  { beep(520, 880, 0.12, 'square'); }
function soundDie()  { beep(440, 80, 0.5, 'sawtooth', 0.2); }

function updateMuteBtn() {
  if (muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊';
}

if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    localStorage.setItem('snake-muted', muted ? '1' : '0');
    updateMuteBtn();
  });
}

// ---------- Частицы ----------
let particles = [];

function spawnParticles(cx, cy) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1 + Math.random() * 2.5;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 1,                     // 1 → 0
      r: 2 + Math.random() * 2,
      hue: 0 + Math.random() * 25, // красно-оранжевые искры
    });
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt * 0.05;
  }
  particles = particles.filter(p => p.life > 0);
}

// ---------- Игровая логика ----------
function reset() {
  snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
  prevSnake = snake.map(s => ({ ...s }));
  dir = { x: 1, y: 0 };
  nextDir = { ...dir };
  score = 0;
  scoreEl.textContent = score;
  particles = [];
  placeFood();
  paused = false;
  running = true;
  overlay.classList.add('hidden');
  lastStep = performance.now();
}

function placeFood() {
  // собираем все свободные клетки и выбираем случайную — без бесконечного
  // цикла при почти заполненном поле
  const free = [];
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
    }
  }
  food = free.length ? free[rand(free.length)] : null; // null = поле заполнено
}

function rand(n) { return Math.floor(Math.random() * n); }

// один шаг логики (раз в TICK мс)
function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // столкновение со стеной
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return gameOver();
  }
  // столкновение с собой (хвост сдвинется, поэтому последний сегмент не считаем,
  // если в эту клетку не растём)
  const willGrow = head.x === food.x && head.y === food.y;
  const body = willGrow ? snake : snake.slice(0, -1);
  if (body.some(s => s.x === head.x && s.y === head.y)) {
    return gameOver();
  }

  prevSnake = snake.map(s => ({ ...s }));
  snake.unshift(head);

  if (willGrow) {
    // частицы и звук в центре съеденной клетки
    spawnParticles(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2);
    soundEat();
    score++;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem('snake-best', best);
    }
    placeFood();
    // при росте у нового хвоста нет «прошлой» позиции — дублируем последнюю
    prevSnake.push({ ...prevSnake[prevSnake.length - 1] });
    if (!food) return win(); // всё поле заполнено — победа
  } else {
    snake.pop();
  }
}

function gameOver() {
  running = false;
  soundDie();
  overlayText.textContent = 'Игра окончена · Счёт ' + score;
  overlay.classList.remove('hidden');
}

function win() {
  running = false;
  overlayText.textContent = 'Победа! Поле заполнено · Счёт ' + score;
  overlay.classList.remove('hidden');
}

// ---------- Рендер ----------
// интерполированный центр сегмента i в пикселях
function segCenter(i, t) {
  const cur = snake[i];
  const prev = prevSnake[Math.min(i, prevSnake.length - 1)] || cur;
  const x = (prev.x + (cur.x - prev.x) * t) * CELL + CELL / 2;
  const y = (prev.y + (cur.y - prev.y) * t) * CELL + CELL / 2;
  return { x, y };
}

function draw(t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawFood();
  drawSnake(t);
  drawParticles();
}

function drawFood() {
  if (!food) return; // поле заполнено — еды нет
  const cx = food.x * CELL + CELL / 2;
  const cy = food.y * CELL + CELL / 2;
  const r = CELL / 2 - 2;

  // тело яблока
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(cx, cy + 1, r, 0, Math.PI * 2);
  ctx.fill();
  // блик
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(cx - r / 3, cy - r / 3, r / 4, 0, Math.PI * 2);
  ctx.fill();
  // хвостик
  ctx.strokeStyle = '#7c4a1e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 1);
  ctx.lineTo(cx + 1, cy - r - 3);
  ctx.stroke();
  // листик
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy - r - 2, 3, 1.6, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnake(t) {
  if (snake.length === 0) return;

  // строим путь по интерполированным центрам сегментов
  const pts = snake.map((_, i) => segCenter(i, t));

  // тело — единая скруглённая линия с сужением к хвосту
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const n = pts.length;
  for (let i = n - 1; i > 0; i--) {
    // голова ярче (h=140 светлый), хвост темнее
    const k = i / n;
    const light = 55 - k * 20;            // 55%..35%
    ctx.strokeStyle = `hsl(140, 65%, ${light}%)`;
    // ширина: к хвосту тоньше
    const taper = i > n - 3 ? (n - i) / 3 : 1;  // последние 2-3 сегмента сужаются
    ctx.lineWidth = (CELL - 3) * Math.max(0.35, taper);
    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
    ctx.stroke();
  }

  drawHead(pts[0]);
}

function drawHead(head) {
  // круглая голова
  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.arc(head.x, head.y, (CELL - 3) / 2, 0, Math.PI * 2);
  ctx.fill();

  // глаза: смещаем перпендикулярно направлению, чуть вперёд
  const dx = dir.x, dy = dir.y;
  const fwd = 3;     // вперёд от центра
  const side = 4;    // в стороны
  const eye1 = { x: head.x + dx * fwd - dy * side, y: head.y + dy * fwd - dx * side };
  const eye2 = { x: head.x + dx * fwd + dy * side, y: head.y + dy * fwd + dx * side };

  for (const e of [eye1, eye2]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(e.x, e.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // зрачок смотрит по направлению движения
    ctx.fillStyle = '#11151c';
    ctx.beginPath();
    ctx.arc(e.x + dx * 1.3, e.y + dy * 1.3, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // раздвоенный язычок (только когда движемся по горизонтали/вертикали)
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.2;
  const tongueBase = { x: head.x + dx * (CELL / 2 - 1), y: head.y + dy * (CELL / 2 - 1) };
  const tip = { x: tongueBase.x + dx * 5, y: tongueBase.y + dy * 5 };
  ctx.beginPath();
  ctx.moveTo(tongueBase.x, tongueBase.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  // вилка
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x + dx * 2 - dy * 2, tip.y + dy * 2 - dx * 2);
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x + dx * 2 + dy * 2, tip.y + dy * 2 + dx * 2);
  ctx.stroke();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = `hsl(${p.hue}, 90%, 55%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- Главный цикл (requestAnimationFrame) ----------
let lastFrame = performance.now();

function loop(now) {
  const dtFrames = Math.min(3, (now - lastFrame) / 16.67); // нормированный dt (в кадрах 60fps)
  lastFrame = now;

  // шаг логики по таймеру
  if (running && !paused) {
    while (now - lastStep >= TICK) {
      lastStep += TICK;
      step();
      if (!running) break;
    }
  } else {
    // на паузе/гейм-овере не копим долг времени
    lastStep = now;
  }

  // коэффициент интерполяции 0..1 между шагами
  const t = running && !paused ? Math.min(1, (now - lastStep) / TICK) : 1;

  updateParticles(dtFrames);
  draw(t);

  requestAnimationFrame(loop);
}

// ---------- Управление (по e.code — независимо от раскладки) ----------
document.addEventListener('keydown', e => {
  ensureAudio();

  if (e.code === 'Space') {
    if (running) paused = !paused;
    e.preventDefault();
    return;
  }

  let nd = null;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') nd = { x: 0, y: -1 };
  else if (e.code === 'ArrowDown' || e.code === 'KeyS') nd = { x: 0, y: 1 };
  else if (e.code === 'ArrowLeft' || e.code === 'KeyA') nd = { x: -1, y: 0 };
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') nd = { x: 1, y: 0 };

  if (nd) {
    e.preventDefault();
    // нельзя развернуться на 180°; проверяем против nextDir, а не dir —
    // иначе два нажатия за один тик дадут разворот в себя
    if (nd.x !== -nextDir.x || nd.y !== -nextDir.y) nextDir = nd;
  }
});

restartBtn.addEventListener('click', () => { ensureAudio(); reset(); });

// ---------- Экспорт чистой логики для тестов (Node) ----------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { COLS, ROWS };
}

// старт
reset();
requestAnimationFrame(loop);
