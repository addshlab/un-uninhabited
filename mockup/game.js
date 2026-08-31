const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;

// 海: 0〜72px
// 砂浜: 波打ち際〜100px前後
// 島内部: それ以下
const state = {
  time: 0,
  waveEnabled: true,
  items: [],
  nextSpawn: 2500,
};

const COLORS = {
  seaDeep: "#1b5d85",
  sea: "#267da0",
  seaLight: "#40a7b7",
  foam: "#d9f4df",
  sand: "#d9b768",
  sandLight: "#e8cb82",
  sandDark: "#b9974e",
  grass: "#648a3a",
  grassLight: "#7aa94a",
  grassDark: "#486b30",
  trunk: "#77522f",
  trunkDark: "#50351f",
  leaf: "#356d35",
  leafLight: "#4f8c43",
  rock: "#6f746b",
  rockDark: "#444842",
  fire: "#ffb13b",
  fire2: "#e65d2f",
  wood: "#785025",
};

function px(x, y, w = 2, h = 2, color = "#fff") {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function shorelineY(x, t = 0) {
  // 画面上部 1/3 周辺で緩く波打つ境界
  return 78
    + Math.sin((x + t * 6) * 0.055) * 5
    + Math.sin((x - t * 3) * 0.017) * 3;
}

function drawSea(t) {
  ctx.fillStyle = COLORS.sea;
  ctx.fillRect(0, 0, W, 92);

  // 深い海の帯
  ctx.fillStyle = COLORS.seaDeep;
  ctx.fillRect(0, 0, W, 26);

  // 海面のドット
  for (let y = 6; y < 74; y += 7) {
    for (let x = (y % 14); x < W; x += 13) {
      const n = (x * 17 + y * 29) % 31;
      const shift = state.waveEnabled ? Math.sin(t * 1.8 + y * 0.18) * 2 : 0;
      if (n < 15) px(x + shift, y, 4, 2, COLORS.seaLight);
      else px(x + shift, y, 3, 1, COLORS.seaDeep);
    }
  }
}

function drawBeach(t) {
  // 砂浜本体
  ctx.fillStyle = COLORS.sand;
  ctx.beginPath();
  ctx.moveTo(0, shorelineY(0, t));
  for (let x = 0; x <= W; x += 4) {
    ctx.lineTo(x, shorelineY(x, t));
  }
  ctx.lineTo(W, 120);
  ctx.lineTo(0, 120);
  ctx.closePath();
  ctx.fill();

  // 波の泡
  for (let x = 0; x < W; x += 5) {
    const y = shorelineY(x, t);
    const bob = state.waveEnabled ? Math.sin(t * 3 + x * 0.08) : 0;
    if (((x / 5) | 0) % 3 !== 1) {
      px(x, y - 2 + bob, 4, 2, COLORS.foam);
    }
  }

  // 砂の粒
  for (let y = 88; y < 119; y += 7) {
    for (let x = 4; x < W; x += 11) {
      if (y > shorelineY(x, t) + 4) {
        const k = (x * 7 + y * 5) % 4;
        px(x, y, 2, 2, k < 2 ? COLORS.sandDark : COLORS.sandLight);
      }
    }
  }
}

function drawIsland() {
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 120, W, H - 120);

  // 草のドット
  for (let y = 124; y < H; y += 8) {
    for (let x = 3; x < W; x += 10) {
      const k = (x * 11 + y * 3) % 5;
      px(x, y, 3, 2, k < 3 ? COLORS.grassLight : COLORS.grassDark);
    }
  }

  drawPalm(45, 157, 1.0);
  drawPalm(214, 168, 0.9);
  drawPalm(164, 220, 1.1);

  drawRock(28, 212, 14, 10);
  drawRock(114, 157, 10, 7);
  drawBush(88, 192);
  drawBush(226, 222);
  drawCampfire(126, 217);
}

function drawPalm(x, y, s = 1) {
  // trunk
  const tw = Math.max(3, Math.round(5 * s));
  const th = Math.round(26 * s);
  px(x - tw/2, y - th/2, tw, th, COLORS.trunk);
  px(x - tw/2, y - th/2 + 4, 2, th - 4, COLORS.trunkDark);

  // crown
  const cy = y - th/2;
  const leaves = [
    [-17, -4, 13, 4], [7, -5, 14, 4],
    [-14, 2, 12, 4], [5, 2, 12, 4],
    [-3, -12, 5, 13], [-2, 2, 5, 13],
  ];

  for (const [dx, dy, w, h] of leaves) {
    px(x + dx*s, cy + dy*s, Math.round(w*s), Math.max(2, Math.round(h*s)), COLORS.leaf);
    px(x + dx*s + 2, cy + dy*s, Math.max(2, Math.round((w-4)*s)), 2, COLORS.leafLight);
  }

  px(x - 2, cy - 1, 4, 4, "#6a4527");
}

function drawRock(x, y, w, h) {
  px(x, y, w, h, COLORS.rockDark);
  px(x + 2, y - 2, w - 4, h, COLORS.rock);
  px(x + 4, y, Math.max(2, w - 8), 2, "#8d9188");
}

function drawBush(x, y) {
  px(x - 8, y, 17, 7, COLORS.leaf);
  px(x - 4, y - 5, 10, 10, COLORS.leaf);
  px(x - 1, y - 7, 3, 9, COLORS.leafLight);
  px(x - 6, y - 3, 3, 7, COLORS.leafLight);
}

function drawCampfire(x, y) {
  // stones
  const stones = [[-8,3],[-4,7],[2,7],[7,3],[7,-2],[2,-5],[-4,-5],[-8,-2]];
  stones.forEach(([dx,dy]) => px(x+dx,y+dy,5,4,COLORS.rock));
  // logs
  px(x - 6, y + 1, 14, 3, COLORS.wood);
  px(x - 2, y - 1, 3, 10, "#533719");
  // flame
  px(x - 2, y - 8, 6, 9, COLORS.fire2);
  px(x - 1, y - 11, 4, 8, COLORS.fire);
  px(x, y - 6, 2, 5, "#ffe277");
}

function drawItems() {
  for (const item of state.items) {
    if (item.type === "wood") {
      px(item.x - 6, item.y - 2, 12, 4, "#845626");
      px(item.x - 2, item.y - 4, 7, 3, "#a66b2d");
    } else if (item.type === "bottle") {
      px(item.x - 2, item.y - 5, 5, 9, "#5bb7a8");
      px(item.x - 1, item.y - 7, 3, 3, "#d6a25c");
      px(item.x - 1, item.y - 1, 3, 2, "#d9ead7");
    } else {
      px(item.x - 4, item.y - 3, 8, 7, "#8c5f2e");
      px(item.x - 2, item.y - 2, 4, 3, "#b17a3b");
    }
  }
}

function spawnItem(x = null, y = null) {
  if (state.items.length >= 9) state.items.shift();

  const types = ["wood", "shell", "bottle"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (x == null) x = 12 + Math.random() * 232;
  if (y == null) {
    // 砂浜内に配置
    const shore = shorelineY(x, state.time);
    y = Math.min(112, shore + 12 + Math.random() * 18);
  }

  state.items.push({ type, x, y });
}

function render(ms) {
  state.time = ms / 1000;
  ctx.clearRect(0, 0, W, H);

  drawSea(state.time);
  drawBeach(state.time);
  drawIsland();
  drawItems();

  requestAnimationFrame(render);
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);

  const sy = shorelineY(x, state.time);
  if (y >= sy && y <= 120) {
    spawnItem(x, y);
    document.getElementById("status").textContent =
      "漂着物を配置しました。砂浜をクリックして増やせます。";
  } else {
    document.getElementById("status").textContent =
      "漂着物は砂浜にだけ置けます。";
  }
});

document.getElementById("spawn").addEventListener("click", () => {
  spawnItem();
});

document.getElementById("toggleWave").addEventListener("click", () => {
  state.waveEnabled = !state.waveEnabled;
});

setInterval(() => {
  spawnItem();
}, 7000);

// 初期漂着物
spawnItem(72, 101);
spawnItem(179, 106);
spawnItem(219, 95);

requestAnimationFrame(render);
