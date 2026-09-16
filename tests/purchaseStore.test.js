const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPurchaseStore } = require('../lib/purchaseStore');

function tempPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mpt-'));
  return {
    purchasesFile: path.join(dir, 'purchases.json'),
    findsFile: path.join(dir, 'finds.json'),
    sourcesFile: path.join(dir, 'sources.json'),
  };
}

test('readPurchases returns empty array when file does not exist', () => {
  const store = createPurchaseStore(tempPaths());
  assert.deepEqual(store.readPurchases(), []);
});

test('addPurchase persists a purchase and readPurchases returns it', () => {
  const store = createPurchaseStore(tempPaths());
  const saved = store.addPurchase({ date: '2026-09-15', item: 'Bamboo tile set', price: 42.5 });

  assert.equal(saved.date, '2026-09-15');
  assert.equal(saved.item, 'Bamboo tile set');
  assert.equal(saved.price, 42.5);
  assert.equal(typeof saved.id, 'number');

  const all = store.readPurchases();
  assert.equal(all.length, 1);
  assert.deepEqual(all[0], saved);
});

test('addPurchase appends to existing purchases without losing them', () => {
  const paths = tempPaths();
  const store = createPurchaseStore(paths);
  store.addPurchase({ date: '2026-09-01', item: 'Tile brush', price: 8 });
  store.addPurchase({ date: '2026-09-02', item: 'Carrying case', price: 25 });

  const all = store.readPurchases();
  assert.equal(all.length, 2);
  assert.equal(all[0].item, 'Tile brush');
  assert.equal(all[1].item, 'Carrying case');
});

test('addPurchase creates the data directory if it does not exist yet', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mpt-'));
  const paths = { purchasesFile: path.join(dir, 'nested', 'purchases.json'), findsFile: path.join(dir, 'nested', 'finds.json') };
  const store = createPurchaseStore(paths);
  store.addPurchase({ date: '2026-09-15', item: 'Mat', price: 15 });
  assert.equal(fs.existsSync(paths.purchasesFile), true);
});

test('readFinds returns empty array when file does not exist', () => {
  const store = createPurchaseStore(tempPaths());
  assert.deepEqual(store.readFinds(), []);
});

test('addFind persists a find with defaults filled in', () => {
  const store = createPurchaseStore(tempPaths());
  const saved = store.addFind({
    name: 'Peacock Feather Boutique Tile Set',
    category: 'set',
    price: 189,
    originalPrice: 249,
    onSale: true,
    saleReason: '24% off, seller-marked clearance',
    url: 'https://example-boutique.com/peacock-set',
    source: 'Example Boutique',
  });

  assert.equal(saved.name, 'Peacock Feather Boutique Tile Set');
  assert.equal(saved.category, 'set');
  assert.equal(saved.price, 189);
  assert.equal(saved.originalPrice, 249);
  assert.equal(saved.onSale, true);
  assert.equal(typeof saved.id, 'string');
  assert.equal(typeof saved.foundDate, 'string');

  const all = store.readFinds();
  assert.equal(all.length, 1);
  assert.deepEqual(all[0], saved);
});

test('addFind defaults originalPrice to null and notes to empty string when omitted', () => {
  const store = createPurchaseStore(tempPaths());
  const saved = store.addFind({
    name: 'Embroidered Mahjong Mat',
    category: 'mat',
    price: 65,
    onSale: false,
    url: 'https://example-boutique.com/mat',
    source: 'Example Boutique',
  });

  assert.equal(saved.originalPrice, null);
  assert.equal(saved.notes, '');
});

test('deleteFind removes only the matching find', () => {
  const store = createPurchaseStore(tempPaths());
  const first = store.addFind({ name: 'A', category: 'rack', price: 30, onSale: false, url: 'https://x.com/a', source: 'X' });
  store.addFind({ name: 'B', category: 'clothing', price: 40, onSale: false, url: 'https://x.com/b', source: 'X' });

  store.deleteFind(first.id);

  const remaining = store.readFinds();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].name, 'B');
});

test('addFind returns null and does not duplicate when the url already exists', () => {
  const store = createPurchaseStore(tempPaths());
  store.addFind({ name: 'A', category: 'rack', price: 30, onSale: false, url: 'https://x.com/a', source: 'X' });
  const second = store.addFind({ name: 'A (relisted)', category: 'rack', price: 28, onSale: true, url: 'https://x.com/a', source: 'X' });

  assert.equal(second, null);
  assert.equal(store.readFinds().length, 1);
});

test('readSources returns empty array when file does not exist', () => {
  const store = createPurchaseStore(tempPaths());
  assert.deepEqual(store.readSources(), []);
});

test('addSource persists a source with defaults filled in', () => {
  const store = createPurchaseStore(tempPaths());
  const saved = store.addSource({ query: 'mahjong tile set', category: 'set', notes: 'High hit rate on Etsy' });

  assert.equal(saved.query, 'mahjong tile set');
  assert.equal(saved.category, 'set');
  assert.equal(saved.notes, 'High hit rate on Etsy');
  assert.equal(typeof saved.id, 'string');
  assert.equal(typeof saved.addedDate, 'string');

  const all = store.readSources();
  assert.equal(all.length, 1);
  assert.deepEqual(all[0], saved);
});

test('addSource returns null and does not duplicate when the query already exists', () => {
  const store = createPurchaseStore(tempPaths());
  store.addSource({ query: 'mahjong tile set', category: 'set' });
  const second = store.addSource({ query: 'mahjong tile set', category: 'set' });

  assert.equal(second, null);
  assert.equal(store.readSources().length, 1);
});

test('deleteSource removes only the matching source', () => {
  const store = createPurchaseStore(tempPaths());
  const first = store.addSource({ query: 'mahjong tile set', category: 'set' });
  store.addSource({ query: 'mahjong rack pusher', category: 'rack' });

  store.deleteSource(first.id);

  const remaining = store.readSources();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].query, 'mahjong rack pusher');
});
