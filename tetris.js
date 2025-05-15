/* ─────────────────────────────────────────────────────────────
   TETRIS  –  HTML + CSS + JavaScript
   Sounds:
     bricks-fall-315300.mp3   ➜ plays every time a piece drops one row
     fireworks-sound-280715.mp3 ➜ plays (with visual) every 100 pts (level-up)
     game-over-arcade-6435.mp3  ➜ plays on game-over
   ───────────────────────────────────────────────────────────── */

const canvas       = document.getElementById('gameCanvas');
const ctx          = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const startButton  = document.getElementById('start-button');

/* Board settings */
const ROW = 20;
const COL = 10;
const SQ  = 24;
const VACANT = '#FFFFFF';

/* Tetromino definitions ---------------------------------------------------- */
const I = [
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]]
];
const O = [[[1,1],[1,1]]];
const T = [
  [[0,0,0],[1,1,1],[0,1,0]],
  [[0,1,0],[1,1,0],[0,1,0]],
  [[0,1,0],[1,1,1],[0,0,0]],
  [[0,1,0],[0,1,1],[0,1,0]]
];
const S = [
  [[0,0,0],[0,1,1],[1,1,0]],
  [[0,1,0],[0,1,1],[0,0,1]]
];
const Z = [
  [[0,0,0],[1,1,0],[0,1,1]],
  [[0,0,1],[0,1,1],[0,1,0]]
];
const J = [
  [[0,0,0],[1,1,1],[0,0,1]],
  [[0,1,0],[0,1,0],[1,1,0]],
  [[1,0,0],[1,1,1],[0,0,0]],
  [[0,1,1],[0,1,0],[0,1,0]]
];
const L = [
  [[0,0,0],[1,1,1],[1,0,0]],
  [[1,1,0],[0,1,0],[0,1,0]],
  [[0,0,1],[1,1,1],[0,0,0]],
  [[0,1,0],[0,1,0],[0,1,1]]
];

/* Piece list with colors */
const PIECES = [
  [I, '#00FFFF'], [O, '#FFFF00'], [T, '#800080'],
  [S, '#00FF00'], [Z, '#FF0000'], [J, '#0000FF'], [L, '#FFA500']
];

/* ── Sounds ───────────────────────────────────────────────── */
const sBrick     = new Audio('bricks-fall-315300.mp3');   // drop click
const sFireworks = new Audio('fireworks-sound-280715.mp3');// level-up
const sGameOver  = new Audio('game-over-arcade-6435.mp3'); // game-over

/* ── Board setup ─────────────────────────────────────────── */
let board = Array.from({ length: ROW }, () => Array(COL).fill(VACANT));

function drawSquare(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * SQ, y * SQ, SQ, SQ);
  ctx.strokeStyle = '#367055';
  ctx.strokeRect(x * SQ, y * SQ, SQ, SQ);
}

function drawBoard() {
  board.forEach((row, r) => row.forEach((col, c) => drawSquare(c, r, col)));
}

/* ── Piece object ----------------------------------------------------------- */
function Piece(shape, color) {
  this.shape   = shape;
  this.color   = color;
  this.index   = 0;                  // rotation index
  this.active  = this.shape[this.index];
  this.x       = 3;
  this.y       = -2;
}

Piece.prototype._fill = function (clr) {
  this.active.forEach((row, r) =>
    row.forEach((v, c) => v && drawSquare(this.x + c, this.y + r, clr))
  );
};
Piece.prototype.draw    = function () { this._fill(this.color); };
Piece.prototype.unDraw  = function () { this._fill(VACANT); };

Piece.prototype.collision = function (dx, dy, pattern) {
  for (let r = 0; r < pattern.length; r++) {
    for (let c = 0; c < pattern[r].length; c++) {
      if (!pattern[r][c]) continue;
      const nx = this.x + c + dx;
      const ny = this.y + r + dy;
      if (nx < 0 || nx >= COL || ny >= ROW) return true;
      if (ny < 0) continue; // above board
      if (board[ny][nx] !== VACANT) return true;
    }
  }
  return false;
};

Piece.prototype.moveDown = function () {
  if (!this.collision(0, 1, this.active)) {
    this.unDraw();
    this.y++;
    this.draw();
    sBrick.currentTime = 0;  // click every row drop
    sBrick.play();
  } else {
    this.lock();
    current = randomPiece();
  }
};
Piece.prototype.moveLeft  = function () { !this.collision(-1,0,this.active) && (this.unDraw(), this.x--, this.draw()); };
Piece.prototype.moveRight = function () { !this.collision( 1,0,this.active) && (this.unDraw(), this.x++, this.draw()); };

Piece.prototype.rotate = function () {
  const next = this.shape[(this.index + 1) % this.shape.length];
  let kick = this.collision(0,0,next) ? (this.x > COL/2 ? -1 : 1) : 0;
  if (!this.collision(kick,0,next)) {
    this.unDraw();
    this.x += kick;
    this.index = (this.index + 1) % this.shape.length;
    this.active = this.shape[this.index];
    this.draw();
  }
};

Piece.prototype.lock = function () {
  /* merge into board */
  this.active.forEach((row, r) => row.forEach((v, c) => {
    if (v) {
      if (this.y + r < 0) {
        failureCount++;
        if (failureCount >= 3) gameOver = true; // Trigger game over after 3 failures
        else current = randomPiece(); // Try again with new piece
      } else board[this.y + r][this.x + c] = this.color;
    }
  }));

  /* line clear + scoring */
  for (let r = 0; r < ROW; r++) {
    if (board[r].every(col => col !== VACANT)) {
      board.splice(r, 1);
      board.unshift(Array(COL).fill(VACANT));
      score += 10;
    }
  }

  /* level-up every 100 pts, max 5 */
  if (score >= level * 100 && level < 5) {
    level++;
    dropDelay = Math.max(100, dropDelay - 150);   // speed up
    showLevelUp(level);
  }

  drawBoard();
  scoreDisplay.textContent = score;
};

/* ── Fireworks visual ------------------------------------------------------- */
class Particle {
  constructor(x, y, color) {
    this.x   = x;          this.y = y;
    this.r   = Math.random()*3 + 2;
    this.c   = color;
    this.vx  = (Math.random()-0.5) * 6;
    this.vy  = (Math.random()-0.5) * 6;
    this.a   = 1;          this.decay = 0.02;
  }
  update() { this.x+=this.vx; this.y+=this.vy; this.a-=this.decay; }
  draw()   {
    ctx.save(); ctx.globalAlpha = this.a;
    ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.fillStyle = this.c; ctx.fill(); ctx.restore();
  }
}
function fireworkBurst(cx, cy) {
  const colors = ['#FF1461','#18FF92','#5A87FF','#FBF38C','#FFAE42'];
  return Array.from({length:30}, () =>
    new Particle(cx, cy, colors[Math.floor(Math.random()*colors.length)])
  );
}
function animateFireworks(particles) {
  function loop() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawBoard(); current.draw();
    let active = false;
    particles.forEach(p => { p.update(); if (p.a>0){active=true; p.draw(); }});
    if (active) requestAnimationFrame(loop);
  }
  loop();
}

/* ── Level-up message & fireworks ------------------------------------------ */
function showLevelUp(lv) {
  sFireworks.currentTime = 0; sFireworks.play();
  ctx.fillStyle = '#00FF00';
  ctx.font = 'bold 30px Arial';
  ctx.fillText(`Level ${lv}!`, canvas.width/4, canvas.height/2 - 40);
  setTimeout(() => animateFireworks(fireworkBurst(canvas.width/2, canvas.height/2)), 600);
}

/* ── Helpers ---------------------------------------------------------------- */
function randomPiece() {
  const p = PIECES[Math.floor(Math.random()*PIECES.length)];
  return new Piece(p[0], p[1]);
}

/* ── Game state ------------------------------------------------------------- */
let current = randomPiece();
let score   = 0;
let level   = 1;
let dropDelay = 1000;          // ms between drops (changes with level)
let lastDrop = Date.now();
let gameOver = false;
let animId   = null;
let failureCount = 0;          // Track number of failures

/* ── Main loop -------------------------------------------------------------- */
function drop() {
  if (Date.now() - lastDrop > dropDelay) {
    current.moveDown();
    lastDrop = Date.now();
  }
  if (!gameOver) animId = requestAnimationFrame(drop);
  else endGame();
}

/* ── Game-over -------------------------------------------------------------- */
function endGame() {
  cancelAnimationFrame(animId);
  sGameOver.currentTime = 0; sGameOver.play();
  ctx.fillStyle = '#FF4444';
  ctx.font = '24px Poppins';
  ctx.fillText('Game Over', canvas.width/4, canvas.height/2);
  startButton.textContent = 'Restart';
}

/* ── Controls --------------------------------------------------------------- */
document.addEventListener('keydown', e => {
  if (gameOver) return;
  if (e.key==='ArrowLeft')  current.moveLeft();
  else if (e.key==='ArrowRight') current.moveRight();
  else if (e.key==='ArrowDown')  current.moveDown();
  else if (e.key==='ArrowUp')    current.rotate();
  else if (e.key===' '){ // hard-drop
    while(!current.collision(0,1,current.active)){current.unDraw(); current.y++; current.draw();}
    current.lock(); current = randomPiece();
  }
});

/* ── Start / Pause / Restart button ---------------------------------------- */
let running = false;
startButton.addEventListener('click', () => {
  if (gameOver) { resetGame(); return; }
  if (!running) { running=true; lastDrop=Date.now(); drop(); startButton.textContent='Pause'; }
  else { running=false; cancelAnimationFrame(animId); startButton.textContent='Resume'; }
});

/* ── Reset game ------------------------------------------------------------- */
function resetGame() {
  board = Array.from({length:ROW},()=>Array(COL).fill(VACANT));
  score = 0; level = 1; dropDelay = 1000; gameOver=false; running=false;
  failureCount = 0; // Reset failure count
  current = randomPiece(); drawBoard(); current.draw();
  scoreDisplay.textContent = 0; startButton.textContent = 'Start';
}