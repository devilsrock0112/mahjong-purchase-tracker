const crypto = require('node:crypto');

const BASE_URL = 'https://api.jsonbin.io/v3/b';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeShortId() {
  return crypto.randomBytes(4).toString('hex');
}

// Finds are stored compactly (short keys, merged sale fields, trimmed Etsy
// URLs) because the JSONBin free plan caps a single record at 100KB and
// this list is the one expected to grow into the hundreds. The API and
// frontend never see this shape directly - compactFind/expandFind adapt
// between it and the stable {name, category, price, ...} contract.
const ETSY_LISTING_RE = /^(https:\/\/www\.etsy\.com\/listing\/\d+)(?:\/.*)?$/;

function compactUrl(url) {
  const m = typeof url === 'string' && url.match(ETSY_LISTING_RE);
  return m ? m[1] : url;
}

function compactFind(friendly) {
  const compact = {
    id: makeShortId(),
    n: String(friendly.name).slice(0, 100),
    c: friendly.category,
    p: friendly.price,
    u: compactUrl(friendly.url),
    s: friendly.source,
    d: friendly.foundDate,
  };
  if (friendly.originalPrice !== null && friendly.originalPrice !== undefined) {
    compact.op = friendly.originalPrice;
    if (friendly.onSale) {
      compact.pct = Math.round((1 - friendly.price / friendly.originalPrice) * 100);
    }
  }
  return compact;
}

function expandFind(compact) {
  return {
    id: compact.id,
    name: compact.n,
    category: compact.c,
    price: compact.p,
    originalPrice: compact.op ?? null,
    onSale: !!compact.pct,
    saleReason: compact.pct ? `${compact.pct}% off, seller-marked` : '',
    url: compact.u,
    source: compact.s,
    foundDate: compact.d,
    notes: '',
  };
}

function createPurchaseStore({ binId, masterKey }) {
  async function readRecord() {
    const res = await fetch(`${BASE_URL}/${binId}/latest`, {
      headers: { 'X-Master-Key': masterKey },
    });
    if (!res.ok) {
      throw new Error(`Failed to read data (status ${res.status})`);
    }
    const body = await res.json();
    return {
      purchases: body.record.purchases || [],
      finds: body.record.finds || [],
      sources: body.record.sources || [],
    };
  }

  async function writeRecord(record) {
    const res = await fetch(`${BASE_URL}/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': masterKey,
      },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      throw new Error(`Failed to save data (status ${res.status})`);
    }
  }

  async function readPurchases() {
    return (await readRecord()).purchases;
  }

  async function addPurchase({ date, item, price }) {
    const record = await readRecord();
    const purchase = { id: Date.now(), date, item, price };
    record.purchases.push(purchase);
    await writeRecord(record);
    return purchase;
  }

  async function readFinds() {
    return (await readRecord()).finds.map(expandFind);
  }

  async function addFind({ name, category, price, originalPrice, onSale, saleReason, url, source, notes }) {
    const record = await readRecord();
    const targetUrl = compactUrl(url);
    const existing = record.finds.find((f) => f.u === targetUrl);
    if (existing) {
      return null;
    }
    const foundDate = new Date().toISOString().slice(0, 10);
    const compact = compactFind({ name, category, price, originalPrice, onSale, url, source, foundDate });
    record.finds.push(compact);
    await writeRecord(record);
    return expandFind(compact);
  }

  async function deleteFind(id) {
    const record = await readRecord();
    record.finds = record.finds.filter((f) => String(f.id) !== String(id));
    await writeRecord(record);
  }

  async function readSources() {
    return (await readRecord()).sources;
  }

  async function addSource({ query, category, notes }) {
    const record = await readRecord();
    const existing = record.sources.find((s) => s.query === query);
    if (existing) {
      return null;
    }
    const source = {
      id: makeId(),
      query,
      category,
      notes: notes || '',
      addedDate: new Date().toISOString().slice(0, 10),
    };
    record.sources.push(source);
    await writeRecord(record);
    return source;
  }

  async function deleteSource(id) {
    const record = await readRecord();
    record.sources = record.sources.filter((s) => String(s.id) !== String(id));
    await writeRecord(record);
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

module.exports = { createPurchaseStore, compactFind, expandFind, compactUrl };
