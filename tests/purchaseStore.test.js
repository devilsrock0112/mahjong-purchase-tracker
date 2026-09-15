const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPurchaseStore } = require('../lib/purchaseStore');

function tempFilePath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mpt-')), 'purchases.json');
}

test('readPurchases returns empty array when file does not exist', () => {
  const store = createPurchaseStore(tempFilePath());
  assert.deepEqual(store.readPurchases(), []);
});

test('addPurchase persists a purchase and readPurchases returns it', () => {
  const store = createPurchaseStore(tempFilePath());
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
  const filePath = tempFilePath();
  const store = createPurchaseStore(filePath);
  store.addPurchase({ date: '2026-09-01', item: 'Tile brush', price: 8 });
  store.addPurchase({ date: '2026-09-02', item: 'Carrying case', price: 25 });

  const all = store.readPurchases();
  assert.equal(all.length, 2);
  assert.equal(all[0].item, 'Tile brush');
  assert.equal(all[1].item, 'Carrying case');
});

test('addPurchase creates the data directory if it does not exist yet', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mpt-'));
  const filePath = path.join(dir, 'nested', 'purchases.json');
  const store = createPurchaseStore(filePath);
  store.addPurchase({ date: '2026-09-15', item: 'Mat', price: 15 });
  assert.equal(fs.existsSync(filePath), true);
});
