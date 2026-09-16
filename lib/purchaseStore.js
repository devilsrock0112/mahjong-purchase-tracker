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

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createPurchaseStore({ purchasesFile, findsFile, sourcesFile }) {
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
    if (finds.some((f) => f.url === url)) {
      return null;
    }
    const find = {
      id: makeId(),
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

  function readSources() {
    return readJsonArray(sourcesFile);
  }

  function addSource({ query, category, notes }) {
    const sources = readSources();
    if (sources.some((s) => s.query === query)) {
      return null;
    }
    const source = {
      id: makeId(),
      query,
      category,
      notes: notes || '',
      addedDate: new Date().toISOString().slice(0, 10),
    };
    sources.push(source);
    writeJsonArrayAtomic(sourcesFile, sources);
    return source;
  }

  function deleteSource(id) {
    const sources = readSources().filter((s) => String(s.id) !== String(id));
    writeJsonArrayAtomic(sourcesFile, sources);
  }

  return {
    readPurchases,
    addPurchase,
    readFinds,
    addFind,
    deleteFind,
    readSources,
    addSource,
    deleteSource,
  };
}

module.exports = { createPurchaseStore };
