const BOARD_RADIUS = 5;
const SQRT3 = Math.sqrt(3);
const hexSize = 46;

function axialToPixel(q, r) {
  const x = hexSize * 1.5 * q;
  const y = hexSize * SQRT3 * (r + q / 2);
  return { x, y };
}

function buildTiles() {
  const result = [];
  for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q += 1) {
    for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r += 1) {
      const s = -q - r;
      if (Math.abs(s) > BOARD_RADIUS) continue;
      const { x, y } = axialToPixel(q, r);
      result.push({ q, r, x, y });
    }
  }
  return result;
}

function buildLetterLabelEntries(tilesArray) {
  const hexSize = 46;
  const bottomLeft = tilesArray
    .filter(tile => tile.r === BOARD_RADIUS)
    .sort((a, b) => a.q - b.q)
    .map(tile => ({ q: tile.q, r: tile.r }));

  const bottomRight = tilesArray
    .filter(tile => -tile.q - tile.r === -BOARD_RADIUS)
    .sort((a, b) => a.q - b.q)
    .map(tile => ({ q: tile.q, r: tile.r }));

  if (bottomRight.length > 0) bottomRight.shift();

  return [...bottomLeft, ...bottomRight];
}

function buildNumberLabelEntries(tilesArray) {
  const hexSize = 46;
  const leftVertical = tilesArray
    .filter(tile => tile.q === -BOARD_RADIUS)
    .sort((a, b) => b.r - a.r)
    .map(tile => ({ q: tile.q, r: tile.r }));

  const leftDiagonal = tilesArray
    .filter(tile => -tile.q - tile.r === BOARD_RADIUS)
    .sort((a, b) => b.r - a.r)
    .map(tile => ({ q: tile.q, r: tile.r }));

  if (leftDiagonal.length > 0) leftDiagonal.shift();

  return [...leftVertical, ...leftDiagonal];
}

const tiles = buildTiles();
const tileMap = new Map();
for (const t of tiles) {
  const { x, y } = axialToPixel(t.q, t.r);
  tileMap.set(`${t.q},${t.r}`, { ...t, centerX: x, centerY: y });
}

const letters = buildLetterLabelEntries(tiles).map((entry, idx) => ({
  ...entry,
  label: String.fromCharCode(65 + idx),
  ...axialToPixel(entry.q, entry.r)
}));

const numbers = buildNumberLabelEntries(tiles).map((entry, idx) => ({
  ...entry,
  label: String(idx + 1),
  ...axialToPixel(entry.q, entry.r)
}));

function distance(a, b) {
  const dx = a.centerX - b.x;
  const dy = a.centerY - b.y;
  return Math.hypot(dx, dy);
}

const mapping = [];
for (const [key, tile] of tileMap.entries()) {
  let bestLetter = null;
  let bestLetterDist = Infinity;
  for (const L of letters) {
    const d = distance(tile, L);
    if (d < bestLetterDist) { bestLetterDist = d; bestLetter = L.label; }
  }
  let bestNumber = null;
  let bestNumberDist = Infinity;
  for (const N of numbers) {
    const d = distance(tile, N);
    if (d < bestNumberDist) { bestNumberDist = d; bestNumber = N.label; }
  }
  mapping.push({ coord: key, letter: bestLetter, number: bestNumber });
}

// Print a few specific spots to cross-check kingside mapping
const interesting = [
  '2,3', // supposed H3
  '3,2', // supposed I4
  '2,-5', // supposed H11
  '3,-5', // supposed I11
];
console.log('Check known squares:');
for (const c of interesting) {
  const m = mapping.find(m => m.coord === c);
  console.log(c, '=>', m.letter + m.number);
}

// Now print requested F1,E1,D1,F11,E10,D9
const targets = ['F1','E1','D1','F11','E10','D9'];
console.log('\nRequested targets:');
for (const t of targets) {
  const letter = t[0];
  const number = t.slice(1);
  const m = mapping.find(m => m.letter === letter && m.number === number);
  console.log(t, '=>', m && m.coord);
}
