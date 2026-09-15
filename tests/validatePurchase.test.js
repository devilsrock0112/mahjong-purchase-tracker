const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePurchase } = require('../lib/validatePurchase');

test('accepts a valid purchase and coerces price to a number', () => {
  const result = validatePurchase({ date: '2026-09-15', item: 'Tile set', price: '42.5' });
  assert.equal(result.valid, true);
  assert.equal(result.price, 42.5);
});

test('rejects a missing date', () => {
  const result = validatePurchase({ date: '', item: 'Tile set', price: 10 });
  assert.equal(result.valid, false);
  assert.match(result.error, /date/);
});

test('rejects a missing item', () => {
  const result = validatePurchase({ date: '2026-09-15', item: '', price: 10 });
  assert.equal(result.valid, false);
  assert.match(result.error, /item/);
});

test('rejects a non-positive price', () => {
  const result = validatePurchase({ date: '2026-09-15', item: 'Tile set', price: 0 });
  assert.equal(result.valid, false);
  assert.match(result.error, /price/);
});
