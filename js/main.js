(function () {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // 棋盘：10 列 20 行
  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 30;

  canvas.width = COLS * BLOCK_SIZE;
  canvas.height = ROWS * BLOCK_SIZE;

  const COLORS = [
    '#000000',    // 0 空
    '#00ffff',    // 1 I
    '#0000ff',    // 2 J
    '#ffa500',    // 3 L
    '#ffff00',    // 4 O
    '#00ff00',    // 5 S
    '#800080',    // 6 T
    '#ff0000'     // 7 Z
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
  let score = 0;
  let lines = 0;
  let gameOver = false;

  // 难度相关
  let dropInterval = 800;      // 当前下落间隔（ms）
  let dropCounter = 0;
  let lastTime = 0;
  let totalTime = 0;           // 累计游戏时间（ms）
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
    const type = randomPieceType();
    const shape = SHAPES[type].map(row => row.slice());
    currentPiece = {
      type,
      matrix: shape,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: 0
    };

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
    dropInterval = 800;
    dropCounter = 0;
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
      result.push(row);
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
    ctx.strokeStyle = '#111';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  }

  function drawBoard() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText('Score: ' + score, 6, 18);
    ctx.fillText('Lines: ' + lines, 6, 34);
    ctx.fillText('Level: ' + level, 6, 50);

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80);
      ctx.fillStyle = '#ffffff';
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

  function update(time = 0) {
    const delta = time - lastTime;
    lastTime = time;

    if (!gameOver) {
      dropCounter += delta;
      totalTime += delta;

      // 随时间升级：每 20 秒提升一级
      const newLevel = 1 + Math.floor(totalTime / 20000);
      if (newLevel !== level) {
        level = newLevel;
      }
      dropInterval = Math.max(180, 800 - (level - 1) * 80);

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

  function bindControls() {
    // 触屏 / 鼠标按钮
    const buttons = document.querySelectorAll('#controls [data-action]');
    buttons.forEach(btn => {
      const action = btn.dataset.action;
      const handler = (e) => {
        e.preventDefault();
        handleAction(action);
      };
      btn.addEventListener('touchstart', handler, { passive: false });
      btn.addEventListener('mousedown', handler);
    });

    // 点击棋盘：Game Over 时重新开始
    const restartHandler = (e) => {
      e.preventDefault();
      if (gameOver) {
        resetGame();
      }
    };
    canvas.addEventListener('touchstart', restartHandler, { passive: false });
    canvas.addEventListener('mousedown', restartHandler);
  }

  // 可选：保留键盘支持（在电脑上调试方便）
  function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (gameOver && (e.code === 'Enter' || e.code === 'Space')) {
        resetGame();
        return;
      }
      if (e.code === 'ArrowLeft') {
        handleAction('left');
      } else if (e.code === 'ArrowRight') {
        handleAction('right');
      } else if (e.code === 'ArrowDown') {
        handleAction('down');
      } else if (e.code === 'ArrowUp') {
        handleAction('rotate');
      } else if (e.code === 'Space') {
        handleAction('hard');
      }
    });
  }

  function main() {
    resetGame();
    bindControls();
    bindKeyboard(); // 只影响电脑调试，不影响手机
    requestAnimationFrame(update);
  }

  main();
})();

