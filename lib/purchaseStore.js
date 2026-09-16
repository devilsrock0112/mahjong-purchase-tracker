const fs = require('node:fs');
const path = require('node:path');

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) {
    return [];
  }
  return JSON.parse(raw);
}

function writeJsonArrayAtomic(filePath, items) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpFile = `${filePath}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(items, null, 2));
  fs.renameSync(tmpFile, filePath);
}

function createPurchaseStore({ purchasesFile, findsFile }) {
  function readPurchases() {
    return readJsonArray(purchasesFile);
  }

  function addPurchase({ date, item, price }) {
    const purchases = readPurchases();
    const purchase = { id: Date.now(), date, item, price };
    purchases.push(purchase);
    writeJsonArrayAtomic(purchasesFile, purchases);
    return purchase;
  }

  function readFinds() {
    return readJsonArray(findsFile);
  }

  function addFind({ name, category, price, originalPrice, onSale, saleReason, url, source, notes }) {
    const finds = readFinds();
    const find = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      category,
      price,
      originalPrice: originalPrice ?? null,
      onSale: !!onSale,
      saleReason: saleReason || '',
      url,
      source,
      foundDate: new Date().toISOString().slice(0, 10),
      notes: notes || '',
    };
    finds.push(find);
    writeJsonArrayAtomic(findsFile, finds);
    return find;
  }

  function deleteFind(id) {
    const finds = readFinds().filter((f) => String(f.id) !== String(id));
    writeJsonArrayAtomic(findsFile, finds);
  }

  return { readPurchases, addPurchase, readFinds, addFind, deleteFind };
}

module.exports = { createPurchaseStore };
