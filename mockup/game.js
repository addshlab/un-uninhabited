const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;
const PLAYABLE_WIDTH = 250;
const BEACH_ITEM_LIMIT = 12;
const INITIAL_INVENTORY_CAPACITY = 8;
const INVENTORY_EXPANSION_SIZE = 4;
const MAX_INVENTORY_CAPACITY = 24;
const SPAWN_INTERVAL = { base: 15000, min: 8000, max: 30000 };

const state = {
  time: 0,
  beachItems: [],
  itemDefinitions: [],
  inventory: { capacity: INITIAL_INVENTORY_CAPACITY, items: [] },
  selectedInventoryId: null,
  nextSpawnAt: null,
  previousSpawnDelay: SPAWN_INTERVAL.base,
  spawnTimer: null,
  message: "アイテムデータを読み込んでいます…",
  messageUntil: Infinity,
};

const COLORS = {
  seaDeep: "#1b5d85", sea: "#267da0", seaLight: "#40a7b7", foam: "#d9f4df",
  sand: "#d9b768", sandLight: "#e8cb82", sandDark: "#b9974e",
  grass: "#648a3a", grassLight: "#7aa94a", grassDark: "#486b30",
  trunk: "#77522f", trunkDark: "#50351f", leaf: "#356d35", leafLight: "#4f8c43",
  rock: "#6f746b", rockDark: "#444842", fire: "#ffb13b", fire2: "#e65d2f", wood: "#785025",
};

function px(x, y, w = 2, h = 2, color = "#fff") {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function shorelineY(x, t = 0) {
  return 78 + Math.sin((x + t * 6) * 0.055) * 5 + Math.sin((x - t * 3) * 0.017) * 3;
}

function isOnBeach(x, y) {
  return y >= shorelineY(x, state.time) && y <= 120;
}

function drawSea(t) {
  ctx.fillStyle = COLORS.sea;
  ctx.fillRect(0, 0, W, 92);
  ctx.fillStyle = COLORS.seaDeep;
  ctx.fillRect(0, 0, W, 26);
  for (let y = 6; y < 74; y += 7) {
    for (let x = y % 14; x < W; x += 13) {
      const n = (x * 17 + y * 29) % 31;
      const shift = Math.sin(t * 1.8 + y * 0.18) * 2;
      px(x + shift, y, n < 15 ? 4 : 3, n < 15 ? 2 : 1, n < 15 ? COLORS.seaLight : COLORS.seaDeep);
    }
  }
}

function drawBeach(t) {
  ctx.fillStyle = COLORS.sand;
  ctx.beginPath();
  ctx.moveTo(0, shorelineY(0, t));
  for (let x = 0; x <= W; x += 4) ctx.lineTo(x, shorelineY(x, t));
  ctx.lineTo(W, 120);
  ctx.lineTo(0, 120);
  ctx.closePath();
  ctx.fill();

  for (let x = 0; x < W; x += 5) {
    const y = shorelineY(x, t);
    const bob = Math.sin(t * 3 + x * 0.08);
    if (((x / 5) | 0) % 3 !== 1) px(x, y - 2 + bob, 4, 2, COLORS.foam);
  }
  for (let y = 88; y < 119; y += 7) {
    for (let x = 4; x < W; x += 11) {
      if (y > shorelineY(x, t) + 4) {
        px(x, y, 2, 2, (x * 7 + y * 5) % 4 < 2 ? COLORS.sandDark : COLORS.sandLight);
      }
    }
  }
}

function drawIsland() {
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 120, W, H - 120);
  for (let y = 124; y < H; y += 8) {
    for (let x = 3; x < W; x += 10) {
      px(x, y, 3, 2, (x * 11 + y * 3) % 5 < 3 ? COLORS.grassLight : COLORS.grassDark);
    }
  }
  drawPalm(45, 151, 1);
  drawPalm(214, 158, .9);
  drawPalm(164, 194, 1.1);
  drawRock(28, 190, 14, 10);
  drawRock(114, 157, 10, 7);
  drawBush(88, 181);
  drawBush(226, 198);
  drawCampfire(126, 192, state.time);
}

function drawPalm(x, y, s = 1) {
  const tw = Math.max(3, Math.round(5 * s));
  const th = Math.round(26 * s);
  px(x - tw / 2, y - th / 2, tw, th, COLORS.trunk);
  px(x - tw / 2, y - th / 2 + 4, 2, th - 4, COLORS.trunkDark);
  const cy = y - th / 2;
  const leaves = [[-17,-4,13,4],[7,-5,14,4],[-14,2,12,4],[5,2,12,4],[-3,-12,5,13],[-2,2,5,13]];
  for (const [dx, dy, w, h] of leaves) {
    px(x + dx * s, cy + dy * s, Math.round(w * s), Math.max(2, Math.round(h * s)), COLORS.leaf);
    px(x + dx * s + 2, cy + dy * s, Math.max(2, Math.round((w - 4) * s)), 2, COLORS.leafLight);
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

function drawCampfire(x, y, t) {
  [[-8,3],[-4,7],[2,7],[7,3],[7,-2],[2,-5],[-4,-5],[-8,-2]].forEach(([dx, dy]) => px(x + dx, y + dy, 5, 4, COLORS.rock));
  px(x - 6, y + 1, 14, 3, COLORS.wood);
  px(x - 2, y - 1, 3, 10, "#533719");
  const frame = Math.floor(t * 8) % 4;
  const sway = [-1, 0, 1, 0][frame];
  const flameTop = [0, 2, 1, 3][frame];
  px(x - 3 + sway, y - 8, 7, 9, COLORS.fire2);
  px(x - 1 + sway, y - 12 + flameTop, 4, 8 - Math.floor(flameTop / 2), COLORS.fire);
  px(x + sway, y - 6, 2, 5, "#ffe277");
}

function drawItem(item) {
  const { x, y } = item;
  switch (item.definition.type) {
    case "wood":
      px(x - 6, y - 2, 12, 4, "#845626"); px(x - 2, y - 4, 7, 3, "#a66b2d"); break;
    case "twig":
      px(x - 5, y - 1, 11, 2, "#6f4826"); px(x + 1, y - 4, 2, 5, "#916337"); break;
    case "bottle":
      px(x - 2, y - 5, 5, 9, "#5bb7a8"); px(x - 1, y - 7, 3, 3, "#d6a25c"); px(x - 1, y - 1, 3, 2, "#d9ead7"); break;
    case "shell":
      px(x - 4, y - 3, 8, 7, "#d99a7b"); px(x - 2, y - 2, 4, 3, "#f1c4a2"); break;
    case "coconut":
      px(x - 4, y - 4, 8, 8, "#704820"); px(x - 2, y - 3, 3, 3, "#9b6a31"); break;
    case "cloth":
      px(x - 5, y - 4, 10, 8, "#b96155"); px(x - 3, y - 2, 6, 2, "#d9816f"); break;
    case "rope":
      ctx.strokeStyle = "#b18a48"; ctx.lineWidth = 2; ctx.strokeRect(Math.round(x - 4), Math.round(y - 4), 8, 8); break;
    case "net":
      ctx.strokeStyle = "#8b8061"; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x - 5), Math.round(y - 4), 10, 8); px(x, y - 4, 1, 8, "#8b8061"); break;
    case "crate":
      px(x - 6, y - 5, 12, 10, "#765026"); px(x - 4, y - 3, 8, 2, "#b07b39"); px(x - 1, y - 5, 2, 10, "#4f331c"); break;
    case "key":
      px(x - 5, y - 1, 10, 2, "#d4b44c"); px(x + 3, y - 3, 2, 5, "#f0d674"); px(x - 5, y - 3, 3, 5, "#d4b44c"); break;
    default:
      px(x - 4, y - 3, 8, 7, "#8c5f2e");
  }
}

function drawBeachItems(now) {
  for (const item of state.beachItems) {
    const remaining = item.expiresAt - now;
    if (remaining <= 10000 && Math.floor(now / 300) % 2 === 0) continue;
    drawItem(item);
  }
}

function makeInstance(definition) {
  return {
    instanceId: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    definition,
  };
}

function chooseWeightedItem(random = Math.random()) {
  const totalWeight = state.itemDefinitions.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random * totalWeight;
  for (const item of state.itemDefinitions) {
    cursor -= item.weight;
    if (cursor < 0) return item;
  }
  return state.itemDefinitions.at(-1);
}

function findOpenBeachPosition() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const x = 12 + Math.random() * (PLAYABLE_WIDTH - 24);
    const shore = shorelineY(x, state.time);
    const y = Math.min(113, shore + 10 + Math.random() * Math.max(5, 112 - shore));
    if (!state.beachItems.some((item) => Math.hypot(item.x - x, item.y - y) < 15)) return { x, y };
  }
  return null;
}

function putOnBeach(instance, x, y, source) {
  const now = Date.now();
  state.beachItems.push({
    ...instance,
    x,
    y,
    source,
    spawnedAt: now,
    expiresAt: now + instance.definition.despawnSeconds * 1000,
  });
}

function spawnRandomItem({ announceSpawn = true } = {}) {
  if (!state.itemDefinitions.length) return false;
  if (state.beachItems.length >= BEACH_ITEM_LIMIT) {
    if (announceSpawn) announce("砂浜がいっぱいで、新しい漂着物は流れ去りました。");
    return false;
  }
  const position = findOpenBeachPosition();
  if (!position) {
    if (announceSpawn) announce("漂着物を置ける場所がありませんでした。");
    return false;
  }
  const definition = chooseWeightedItem();
  putOnBeach(makeInstance(definition), position.x, position.y, "drift");
  if (announceSpawn) announce(`${definition.name}が流れ着きました。`);
  return true;
}

function calculateNextSpawnDelay(random = Math.random()) {
  const randomFactor = .6 + random * 1;
  const shortIntervalCorrection = state.previousSpawnDelay < SPAWN_INTERVAL.base ? 1.25 : 1;
  return Math.round(clamp(
    SPAWN_INTERVAL.base * randomFactor * shortIntervalCorrection,
    SPAWN_INTERVAL.min,
    SPAWN_INTERVAL.max,
  ));
}

function scheduleNextSpawn() {
  clearTimeout(state.spawnTimer);
  const delay = calculateNextSpawnDelay();
  state.previousSpawnDelay = delay;
  state.nextSpawnAt = Date.now() + delay;
  state.spawnTimer = setTimeout(() => {
    spawnRandomItem();
    scheduleNextSpawn();
  }, delay);
}

function removeExpiredItems(now) {
  const expired = state.beachItems.filter((item) => item.expiresAt <= now);
  if (!expired.length) return;
  state.beachItems = state.beachItems.filter((item) => item.expiresAt > now);
  const names = [...new Set(expired.map((item) => item.definition.name))].join("、");
  announce(`${names}は波にさらわれました。`);
}

function collectItem(item) {
  if (state.inventory.items.length >= state.inventory.capacity) {
    announce("インベントリが満杯です。漂着物は砂浜に残っています。");
    return;
  }
  state.beachItems = state.beachItems.filter((candidate) => candidate.instanceId !== item.instanceId);
  state.inventory.items.push({ instanceId: item.instanceId, definition: item.definition });
  announce(`${item.definition.name}を取得しました。${item.definition.description}`);
  renderInventory();
}

function placeSelectedItem(x, y) {
  const item = state.inventory.items.find((candidate) => candidate.instanceId === state.selectedInventoryId);
  if (!item) return false;
  if (!isOnBeach(x, y)) {
    announce("アイテムは砂浜にだけ配置できます。");
    return true;
  }
  if (state.beachItems.length >= BEACH_ITEM_LIMIT) {
    announce("砂浜がいっぱいです。アイテムはインベントリに残っています。");
    return true;
  }
  if (state.beachItems.some((candidate) => Math.hypot(candidate.x - x, candidate.y - y) < 15)) {
    announce("ほかの漂着物から少し離して配置してください。");
    return true;
  }
  state.inventory.items = state.inventory.items.filter((candidate) => candidate.instanceId !== item.instanceId);
  putOnBeach(item, x, y, "inventory");
  state.selectedInventoryId = null;
  announce(`${item.definition.name}を砂浜に配置しました。`);
  renderInventory();
  return true;
}

function findClickedItem(x, y) {
  return [...state.beachItems].reverse().find((item) => Math.hypot(item.x - x, item.y - y) <= 9);
}

function announce(message, duration = 5000) {
  state.message = message;
  state.messageUntil = Date.now() + duration;
  updateStatus();
}

function updateStatus() {
  const now = Date.now();
  const next = state.nextSpawnAt == null ? "--" : Math.max(0, Math.ceil((state.nextSpawnAt - now) / 1000));
  const summary = `次の漂着：約${next}秒 ｜ 砂浜 ${state.beachItems.length}/${BEACH_ITEM_LIMIT}`;
  const message = now < state.messageUntil ? state.message : "漂着物をクリックすると取得できます。";
  document.getElementById("status").textContent = `${message}\n${summary}`;
}

function renderInventory() {
  const grid = document.getElementById("inventoryGrid");
  grid.replaceChildren();
  for (let index = 0; index < state.inventory.capacity; index += 1) {
    const item = state.inventory.items[index];
    const slot = document.createElement("button");
    slot.className = "slot";
    if (item) {
      slot.classList.add("filled");
      slot.textContent = item.definition.name;
      slot.title = item.definition.description;
      slot.setAttribute("aria-label", `${item.definition.name}を選択`);
      if (item.instanceId === state.selectedInventoryId) slot.classList.add("selected");
      slot.addEventListener("click", () => {
        state.selectedInventoryId = state.selectedInventoryId === item.instanceId ? null : item.instanceId;
        renderInventory();
      });
    } else {
      slot.textContent = "空き";
      slot.disabled = true;
    }
    grid.append(slot);
  }
  document.getElementById("inventoryCount").textContent = `${state.inventory.items.length} / ${state.inventory.capacity}`;
  const selected = state.inventory.items.find((item) => item.instanceId === state.selectedInventoryId);
  document.getElementById("selection").textContent = selected
    ? `${selected.definition.name}を選択中。砂浜をクリックして配置します。`
    : "アイテムを選ぶと砂浜に配置できます。";
  document.getElementById("cancelSelection").disabled = !selected;
  document.getElementById("expandInventory").disabled = state.inventory.capacity >= MAX_INVENTORY_CAPACITY;
}

function render(ms) {
  state.time = ms / 1000;
  const now = Date.now();
  removeExpiredItems(now);
  ctx.clearRect(0, 0, W, H);
  drawSea(state.time);
  drawBeach(state.time);
  drawIsland();
  drawBeachItems(now);
  requestAnimationFrame(render);
}

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);
  const clickedItem = findClickedItem(x, y);
  if (clickedItem) {
    collectItem(clickedItem);
    return;
  }
  if (placeSelectedItem(x, y)) return;
  announce(isOnBeach(x, y) ? "ここには漂着物がありません。" : "砂浜の漂着物をクリックしてください。");
});

document.getElementById("spawn").addEventListener("click", () => spawnRandomItem());
document.getElementById("cancelSelection").addEventListener("click", () => {
  state.selectedInventoryId = null;
  renderInventory();
});
document.getElementById("expandInventory").addEventListener("click", () => {
  const oldCapacity = state.inventory.capacity;
  state.inventory.capacity = Math.min(MAX_INVENTORY_CAPACITY, oldCapacity + INVENTORY_EXPANSION_SIZE);
  announce(`インベントリを${oldCapacity}枠から${state.inventory.capacity}枠へ拡張しました。`);
  renderInventory();
});

async function initialize() {
  renderInventory();
  try {
    const response = await fetch("./data/items.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.items) || !data.items.length) throw new Error("itemsが空です");
    state.itemDefinitions = data.items;
    document.getElementById("spawn").disabled = false;
    spawnRandomItem({ announceSpawn: false });
    spawnRandomItem({ announceSpawn: false });
    spawnRandomItem({ announceSpawn: false });
    announce("漂着物をクリックすると取得できます。", 4000);
    scheduleNextSpawn();
  } catch (error) {
    state.message = `アイテムデータを読み込めませんでした。HTTPサーバーから起動してください（${error.message}）。`;
    state.messageUntil = Infinity;
    updateStatus();
  }
}

setInterval(updateStatus, 1000);
requestAnimationFrame(render);
initialize();
