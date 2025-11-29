(function () {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const nextCanvas = document.getElementById('next-canvas');
  const nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;

  // 棋盘：10 列 20 行
  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 30;

  canvas.width = COLS * BLOCK_SIZE;
  canvas.height = ROWS * BLOCK_SIZE;

  const COLORS = [
    '#000000',    // 0 空
    '#0ea5e9',    // 1 I
    '#6366f1',    // 2 J
    '#f97316',    // 3 L
    '#eab308',    // 4 O
    '#22c55e',    // 5 S
    '#a855f7',    // 6 T
    '#ef4444'     // 7 Z
  ];

  const SHAPES = {
    1: [ [1, 1, 1, 1] ],                    // I
    2: [ [1, 0, 0], [1, 1, 1] ],            // J
    3: [ [0, 0, 1], [1, 1, 1] ],            // L
    4: [ [1, 1], [1, 1] ],                  // O
    5: [ [0, 1, 1], [1, 1, 0] ],            // S
    6: [ [0, 1, 0], [1, 1, 1] ],            // T
    7: [ [1, 1, 0], [0, 1, 1] ]             // Z
  };

  let board;
  let currentPiece;
  let nextType;          // 下一块类型

  let score = 0;
  let lines = 0;
  let gameOver = false;

  // 难度相关：更温和的曲线
  const BASE_INTERVAL = 900;      // 初始 900ms
  const MIN_INTERVAL  = 300;      // 最快 300ms
  const LEVEL_TIME    = 30000;    // 每 30 秒升一级
  const LEVEL_STEP    = 60;       // 每级减少 60ms

  let dropInterval = BASE_INTERVAL;
  let dropCounter = 0;
  let lastTime = 0;
  let totalTime = 0;
  let level = 1;

  function createBoard() {
    const matrix = [];
    for (let y = 0; y < ROWS; y++) {
      matrix.push(new Array(COLS).fill(0));
    }
    return matrix;
  }

  function randomPieceType() {
    return 1 + Math.floor(Math.random() * 7);
  }

  function spawnPiece() {
    const type = nextType != null ? nextType : randomPieceType();
    const shape = SHAPES[type].map(row => row.slice());
    currentPiece = {
      type,
      matrix: shape,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: 0
    };

    // 为下一次生成下一个类型
    nextType = randomPieceType();
    drawNextPiece();

    if (collide(board, currentPiece)) {
      gameOver = true;
    }
  }

  function resetGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    gameOver = false;
    level = 1;
    totalTime = 0;
    dropInterval = BASE_INTERVAL;
    dropCounter = 0;

    nextType = randomPieceType();
    spawnPiece();
  }

  function collide(board, piece) {
    const m = piece.matrix;
    for (let y = 0; y < m.length; y++) {
      for (let x = 0; x < m[y].length; x++) {
        if (m[y][x] !== 0) {
          const bx = piece.x + x;
          const by = piece.y + y;
          if (
            by < 0 || by >= ROWS ||
            bx < 0 || bx >= COLS ||
            board[by][bx] !== 0
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function merge(board, piece) {
    const m = piece.matrix;
    for (let y = 0; y < m.length; y++) {
      for (let x = 0; x < m[y].length; x++) {
        if (m[y][x] !== 0) {
          const bx = piece.x + x;
          const by = piece.y + y;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
            board[by][bx] = piece.type;
          }
        }
      }
    }
  }

  function rotateMatrix(matrix) {
    const N = matrix.length;
    const M = matrix[0].length;
    const result = [];
    for (let x = 0; x < M; x++) {
      const row = [];
      for (let y = N - 1; y >= 0; y--) {
        row.push(matrix[y][x]);
      }
      row.length && result.push(row);
    }
    return result;
  }

  function rotatePiece() {
    if (gameOver) return;
    const oldMatrix = currentPiece.matrix;
    const rotated = rotateMatrix(oldMatrix);
    const oldX = currentPiece.x;

    currentPiece.matrix = rotated;

    if (collide(board, currentPiece)) {
      currentPiece.x = oldX - 1;
      if (collide(board, currentPiece)) {
        currentPiece.x = oldX + 1;
        if (collide(board, currentPiece)) {
          currentPiece.x = oldX;
          currentPiece.matrix = oldMatrix;
        }
      }
    }
  }

  function clearLines() {
    let cleared = 0;

    outer: for (let y = ROWS - 1; y >= 0; y--) {
      for (let x = 0; x < COLS; x++) {
        if (board[y][x] === 0) {
          continue outer;
        }
      }
      const row = board.splice(y, 1)[0];
      row.fill(0);
      board.unshift(row);
      cleared++;
      y++;
    }

    if (cleared > 0) {
      lines += cleared;
      score += cleared * cleared * 100;
    }
  }

  function playerMove(dir) {
    if (gameOver) return;
    currentPiece.x += dir;
    if (collide(board, currentPiece)) {
      currentPiece.x -= dir;
    }
  }

  function playerDrop() {
    if (gameOver) return;
    currentPiece.y++;
    if (collide(board, currentPiece)) {
      currentPiece.y--;
      merge(board, currentPiece);
      clearLines();
      spawnPiece();
    }
    dropCounter = 0;
  }

  function hardDrop() {
    if (gameOver) return;
    while (!collide(board, { ...currentPiece, y: currentPiece.y + 1 })) {
      currentPiece.y++;
    }
    merge(board, currentPiece);
    clearLines();
    spawnPiece();
    dropCounter = 0;
  }

  function drawCell(x, y, type) {
    if (type === 0) return;
    ctx.fillStyle = COLORS[type];
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#020617';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  }

  function drawGrid() {
    ctx.strokeStyle = '#1f2937'; // 网格线颜色
    ctx.lineWidth = 0.5;

    // 垂直线
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      const px = x * BLOCK_SIZE + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
      ctx.stroke();
    }

    // 水平线
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      const py = y * BLOCK_SIZE + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
      ctx.stroke();
    }
  }

  function drawBoard() {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 网格
    drawGrid();

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        drawCell(x, y, board[y][x]);
      }
    }

    const m = currentPiece.matrix;
    for (let y = 0; y < m.length; y++) {
      for (let x = 0; x < m[y].length; x++) {
        if (m[y][x] !== 0) {
          drawCell(currentPiece.x + x, currentPiece.y + y, currentPiece.type);
        }
      }
    }

    ctx.fillStyle = '#e5e7eb';
    ctx.font = '14px sans-serif';
    ctx.fillText('Score: ' + score, 6, 18);
    ctx.fillText('Lines: ' + lines, 6, 34);
    ctx.fillText('Level: ' + level, 6, 50);

    if (gameOver) {
      ctx.fillStyle = 'rgba(15,23,42,0.72)';
      ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80);
      ctx.fillStyle = '#f9fafb';
      ctx.font = '22px sans-serif';
      const msg = 'Game Over';
      const msg2 = '点棋盘重新开始';
      const w1 = ctx.measureText(msg).width;
      const w2 = ctx.measureText(msg2).width;
      ctx.fillText(msg, (canvas.width - w1) / 2, canvas.height / 2 - 6);
      ctx.font = '16px sans-serif';
      ctx.fillText(msg2, (canvas.width - w2) / 2, canvas.height / 2 + 22);
    }
  }

  function drawNextPiece() {
    if (!nextCtx || nextType == null) return;

    const w = nextCanvas.width;
    const h = nextCanvas.height;

    nextCtx.fillStyle = '#111827';
    nextCtx.fillRect(0, 0, w, h);

    const shape = SHAPES[nextType];
    if (!shape) return;

    const rows = shape.length;
    const cols = shape[0].length;

    const BLOCK = Math.floor(Math.min(w / (cols + 1), h / (rows + 1)));

    const offsetX = (w - cols * BLOCK) / 2;
    const offsetY = (h - rows * BLOCK) / 2;

    nextCtx.strokeStyle = '#020617';
    nextCtx.lineWidth = 0.5;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (shape[y][x]) {
          const px = offsetX + x * BLOCK;
          const py = offsetY + y * BLOCK;
          nextCtx.fillStyle = COLORS[nextType];
          nextCtx.fillRect(px, py, BLOCK, BLOCK);
          nextCtx.strokeRect(px, py, BLOCK, BLOCK);
        }
      }
    }
  }

  function update(time = 0) {
    const delta = time - lastTime;
    lastTime = time;

    if (!gameOver) {
      dropCounter += delta;
      totalTime += delta;

      // 时间驱动的等级和速度
      const newLevel = 1 + Math.floor(totalTime / LEVEL_TIME);
      if (newLevel !== level) {
        level = newLevel;
      }
      dropInterval = Math.max(
        MIN_INTERVAL,
        BASE_INTERVAL - (level - 1) * LEVEL_STEP
      );

      if (dropCounter > dropInterval) {
        playerDrop();
      }
    }

    drawBoard();
    requestAnimationFrame(update);
  }

  function handleAction(action) {
    if (gameOver) return;
    if (action === 'left') {
      playerMove(-1);
    } else if (action === 'right') {
      playerMove(1);
    } else if (action === 'down') {
      playerDrop();
    } else if (action === 'rotate') {
      rotatePiece();
    } else if (action === 'hard') {
      hardDrop();
    }
  }

  // 只支持触屏（手机优先）
  function bindControls() {
    const buttons = document.querySelectorAll('#controls [data-action]');

    // 控制按钮：touchstart
    buttons.forEach(btn => {
      const action = btn.dataset.action;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleAction(action);
      }, { passive: false });
    });

    // 点击棋盘：Game Over 时重新开始
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (gameOver) {
        resetGame();
      }
    }, { passive: false });
  }

  function main() {
    resetGame();
    bindControls();
    requestAnimationFrame(update);
  }

  main();
})();
