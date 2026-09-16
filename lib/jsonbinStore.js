const BASE_URL = 'https://api.jsonbin.io/v3/b';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    return (await readRecord()).finds;
  }

  async function addFind({ name, category, price, originalPrice, onSale, saleReason, url, source, notes }) {
    const record = await readRecord();
    const existing = record.finds.find((f) => f.url === url);
    if (existing) {
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
    record.finds.push(find);
    await writeRecord(record);
    return find;
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

module.exports = { createPurchaseStore };
