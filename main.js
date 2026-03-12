const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const selectedEl = document.getElementById('selected');

const TILE = 24;
const WORLD_W = 240;
const WORLD_H = 120;

const Block = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,
};

const BLOCK_ORDER = [Block.GRASS, Block.DIRT, Block.STONE, Block.WOOD];
const BLOCK_NAME = {
  [Block.GRASS]: 'Трава',
  [Block.DIRT]: 'Земля',
  [Block.STONE]: 'Камень',
  [Block.WOOD]: 'Дерево',
};
const BLOCK_COLOR = {
  [Block.GRASS]: '#5dbb63',
  [Block.DIRT]: '#8d5a33',
  [Block.STONE]: '#6f7a87',
  [Block.WOOD]: '#9f7648',
};

let selectedBlockIndex = 0;
function selectedBlock() {
  return BLOCK_ORDER[selectedBlockIndex];
}

const world = Array.from({ length: WORLD_H }, () => new Uint8Array(WORLD_W));

function generateWorld() {
  for (let x = 0; x < WORLD_W; x++) {
    const surface = Math.floor(50 + Math.sin(x * 0.12) * 4 + Math.sin(x * 0.03) * 8);
    for (let y = surface; y < WORLD_H; y++) {
      if (y === surface) world[y][x] = Block.GRASS;
      else if (y < surface + 6) world[y][x] = Block.DIRT;
      else world[y][x] = Block.STONE;
    }

    if (Math.random() < 0.08) {
      const trunkH = 4 + Math.floor(Math.random() * 3);
      for (let t = 1; t <= trunkH; t++) {
        const ty = surface - t;
        if (ty > 0) world[ty][x] = Block.WOOD;
      }
    }
  }

  for (let i = 0; i < 200; i++) {
    const cx = 10 + Math.floor(Math.random() * (WORLD_W - 20));
    const cy = 60 + Math.floor(Math.random() * (WORLD_H - 65));
    const rad = 2 + Math.floor(Math.random() * 4);
    for (let y = cy - rad; y <= cy + rad; y++) {
      for (let x = cx - rad; x <= cx + rad; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= rad * rad && inBounds(x, y)) world[y][x] = Block.AIR;
      }
    }
  }
}

const player = {
  x: 40 * TILE,
  y: 20 * TILE,
  w: TILE * 0.8,
  h: TILE * 1.6,
  vx: 0,
  vy: 0,
  onGround: false,
  inventory: {
    [Block.GRASS]: 20,
    [Block.DIRT]: 70,
    [Block.STONE]: 20,
    [Block.WOOD]: 20,
  },
};

const keys = new Set();
const mouse = {
  x: 0,
  y: 0,
};

let cameraX = 0;
let cameraY = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function inBounds(tx, ty) {
  return tx >= 0 && ty >= 0 && tx < WORLD_W && ty < WORLD_H;
}

function tileAtPixel(px, py) {
  return {
    tx: Math.floor(px / TILE),
    ty: Math.floor(py / TILE),
  };
}

function isSolidAt(tx, ty) {
  if (!inBounds(tx, ty)) return true;
  return world[ty][tx] !== Block.AIR;
}

function rectCollides(x, y, w, h) {
  const minTX = Math.floor(x / TILE);
  const minTY = Math.floor(y / TILE);
  const maxTX = Math.floor((x + w - 1) / TILE);
  const maxTY = Math.floor((y + h - 1) / TILE);

  for (let ty = minTY; ty <= maxTY; ty++) {
    for (let tx = minTX; tx <= maxTX; tx++) {
      if (isSolidAt(tx, ty)) return true;
    }
  }
  return false;
}

function update(dt) {
  const accel = 1100;
  const maxSpeed = 220;
  const friction = 0.83;
  const gravity = 1200;

  if (keys.has('a') || keys.has('arrowleft')) player.vx -= accel * dt;
  if (keys.has('d') || keys.has('arrowright')) player.vx += accel * dt;

  player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
  player.vx *= friction;

  if ((keys.has('w') || keys.has(' ') || keys.has('arrowup')) && player.onGround) {
    player.vy = -430;
    player.onGround = false;
  }

  player.vy += gravity * dt;

  const nx = player.x + player.vx * dt;
  if (!rectCollides(nx, player.y, player.w, player.h)) {
    player.x = nx;
  } else {
    const step = Math.sign(player.vx) || 1;
    while (!rectCollides(player.x + step, player.y, player.w, player.h)) player.x += step;
    player.vx = 0;
  }

  const ny = player.y + player.vy * dt;
  if (!rectCollides(player.x, ny, player.w, player.h)) {
    player.y = ny;
    player.onGround = false;
  } else {
    const step = Math.sign(player.vy) || 1;
    while (!rectCollides(player.x, player.y + step, player.w, player.h)) player.y += step;
    player.onGround = player.vy > 0;
    player.vy = 0;
  }

  cameraX = player.x + player.w / 2 - canvas.width / 2;
  cameraY = player.y + player.h / 2 - canvas.height / 2;

  cameraX = Math.max(0, Math.min(cameraX, WORLD_W * TILE - canvas.width));
  cameraY = Math.max(0, Math.min(cameraY, WORLD_H * TILE - canvas.height));
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#59a9ff');
  g.addColorStop(1, '#1f2f57');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawWorld() {
  const startX = Math.floor(cameraX / TILE);
  const endX = Math.ceil((cameraX + canvas.width) / TILE);
  const startY = Math.floor(cameraY / TILE);
  const endY = Math.ceil((cameraY + canvas.height) / TILE);

  for (let ty = startY; ty <= endY; ty++) {
    if (ty < 0 || ty >= WORLD_H) continue;
    for (let tx = startX; tx <= endX; tx++) {
      if (tx < 0 || tx >= WORLD_W) continue;
      const block = world[ty][tx];
      if (block === Block.AIR) continue;

      const sx = tx * TILE - cameraX;
      const sy = ty * TILE - cameraY;

      ctx.fillStyle = BLOCK_COLOR[block] || '#fff';
      ctx.fillRect(sx, sy, TILE, TILE);

      ctx.strokeStyle = 'rgba(0,0,0,0.17)';
      ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
    }
  }
}

function drawPlayer() {
  const sx = player.x - cameraX;
  const sy = player.y - cameraY;

  ctx.fillStyle = '#f2c17d';
  ctx.fillRect(sx, sy, player.w, player.h);

  ctx.fillStyle = '#233b72';
  ctx.fillRect(sx + 2, sy + player.h * 0.35, player.w - 4, player.h * 0.6);
}

function drawCursorTile() {
  const worldX = mouse.x + cameraX;
  const worldY = mouse.y + cameraY;
  const { tx, ty } = tileAtPixel(worldX, worldY);
  if (!inBounds(tx, ty)) return;

  const sx = tx * TILE - cameraX;
  const sy = ty * TILE - cameraY;
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
}

function drawHUD() {
  const block = selectedBlock();
  selectedEl.textContent = `${BLOCK_NAME[block]} (${player.inventory[block] || 0})`;

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(16, canvas.height - 54, BLOCK_ORDER.length * 52 + 10, 38);

  BLOCK_ORDER.forEach((b, i) => {
    const x = 22 + i * 52;
    const y = canvas.height - 48;
    ctx.fillStyle = BLOCK_COLOR[b];
    ctx.fillRect(x, y, 28, 28);
    if (i === selectedBlockIndex) {
      ctx.strokeStyle = '#ffe699';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, 32, 32);
    }
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(String(player.inventory[b] || 0), x + 34, y + 18);
  });
}

function mineAt(tx, ty) {
  if (!inBounds(tx, ty)) return;
  const block = world[ty][tx];
  if (block === Block.AIR) return;

  const centerPx = tx * TILE + TILE / 2;
  const centerPy = ty * TILE + TILE / 2;
  const dx = centerPx - (player.x + player.w / 2);
  const dy = centerPy - (player.y + player.h / 2);
  if (dx * dx + dy * dy > (TILE * 6) ** 2) return;

  world[ty][tx] = Block.AIR;
  player.inventory[block] = (player.inventory[block] || 0) + 1;
}

function placeAt(tx, ty) {
  if (!inBounds(tx, ty)) return;
  if (world[ty][tx] !== Block.AIR) return;

  const block = selectedBlock();
  if ((player.inventory[block] || 0) <= 0) return;

  const centerPx = tx * TILE + TILE / 2;
  const centerPy = ty * TILE + TILE / 2;
  const dx = centerPx - (player.x + player.w / 2);
  const dy = centerPy - (player.y + player.h / 2);
  if (dx * dx + dy * dy > (TILE * 6) ** 2) return;

  world[ty][tx] = block;
  if (rectCollides(player.x, player.y, player.w, player.h)) {
    world[ty][tx] = Block.AIR;
    return;
  }

  player.inventory[block] -= 1;
}

canvas.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener('mousedown', (e) => {
  const worldX = mouse.x + cameraX;
  const worldY = mouse.y + cameraY;
  const { tx, ty } = tileAtPixel(worldX, worldY);

  if (e.button === 0) mineAt(tx, ty);
  if (e.button === 2) placeAt(tx, ty);
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  keys.add(e.key.toLowerCase());
  if (e.key >= '1' && e.key <= '4') {
    selectedBlockIndex = Number(e.key) - 1;
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('wheel', (e) => {
  if (e.deltaY > 0) selectedBlockIndex = (selectedBlockIndex + 1) % BLOCK_ORDER.length;
  else selectedBlockIndex = (selectedBlockIndex + BLOCK_ORDER.length - 1) % BLOCK_ORDER.length;
});
window.addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  update(dt);

  drawSky();
  drawWorld();
  drawPlayer();
  drawCursorTile();
  drawHUD();

  requestAnimationFrame(frame);
}

generateWorld();
resize();
requestAnimationFrame(frame);
