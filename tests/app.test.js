const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../app');
const { createPurchaseStore } = require('../lib/purchaseStore');

function startTestServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mpt-app-'));
  const store = createPurchaseStore({
    purchasesFile: path.join(dir, 'purchases.json'),
    findsFile: path.join(dir, 'finds.json'),
    sourcesFile: path.join(dir, 'sources.json'),
  });
  const app = createApp(store);
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test('GET /api/purchases returns an empty array initially', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/purchases`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  } finally {
    server.close();
  }
});

test('POST /api/purchases adds a purchase and it shows up in GET', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const postRes = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-09-15', item: 'Rack set', price: 60 }),
    });
    assert.equal(postRes.status, 201);
    const created = await postRes.json();
    assert.equal(created.item, 'Rack set');

    const getRes = await fetch(`${baseUrl}/api/purchases`);
    const all = await getRes.json();
    assert.equal(all.length, 1);
    assert.equal(all[0].item, 'Rack set');
  } finally {
    server.close();
  }
});

test('POST /api/purchases rejects a missing item', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-09-15', item: '', price: 10 }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
  } finally {
    server.close();
  }
});

test('POST /api/purchases rejects a non-positive price', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-09-15', item: 'Tiles', price: -5 }),
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test('GET /api/finds returns an empty array initially', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/finds`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  } finally {
    server.close();
  }
});

test('POST /api/finds adds a find and it shows up in GET, then DELETE removes it', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const postRes = await fetch(`${baseUrl}/api/finds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Peacock Feather Boutique Tile Set',
        category: 'set',
        price: 189,
        originalPrice: 249,
        onSale: true,
        saleReason: '24% off, seller-marked clearance',
        url: 'https://example-boutique.com/peacock-set',
        source: 'Example Boutique',
      }),
    });
    assert.equal(postRes.status, 201);
    const created = await postRes.json();
    assert.equal(created.name, 'Peacock Feather Boutique Tile Set');
    assert.equal(created.onSale, true);

    const getRes = await fetch(`${baseUrl}/api/finds`);
    const all = await getRes.json();
    assert.equal(all.length, 1);

    const delRes = await fetch(`${baseUrl}/api/finds/${created.id}`, { method: 'DELETE' });
    assert.equal(delRes.status, 204);

    const afterDelete = await (await fetch(`${baseUrl}/api/finds`)).json();
    assert.equal(afterDelete.length, 0);
  } finally {
    server.close();
  }
});

test('POST /api/finds rejects an invalid category', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/finds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Mystery Item', category: 'gadget', price: 20, url: 'https://x.com', source: 'X' }),
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test('POST /api/finds rejects a missing url', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/finds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Mystery Item', category: 'set', price: 20, source: 'X' }),
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test('POST /api/finds reports a duplicate instead of creating a second row for the same url', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const payload = { name: 'Dup Item', category: 'set', price: 20, onSale: false, url: 'https://x.com/dup', source: 'X' };
    await fetch(`${baseUrl}/api/finds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const secondRes = await fetch(`${baseUrl}/api/finds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(secondRes.status, 200);
    const body = await secondRes.json();
    assert.equal(body.duplicate, true);

    const all = await (await fetch(`${baseUrl}/api/finds`)).json();
    assert.equal(all.length, 1);
  } finally {
    server.close();
  }
});

test('GET /api/sources returns an empty array initially', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/sources`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  } finally {
    server.close();
  }
});

test('POST /api/sources adds a source and it shows up in GET, then DELETE removes it', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const postRes = await fetch(`${baseUrl}/api/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'mahjong tile set', category: 'set', notes: 'High hit rate on Etsy' }),
    });
    assert.equal(postRes.status, 201);
    const created = await postRes.json();
    assert.equal(created.query, 'mahjong tile set');

    const getRes = await fetch(`${baseUrl}/api/sources`);
    const all = await getRes.json();
    assert.equal(all.length, 1);

    const delRes = await fetch(`${baseUrl}/api/sources/${created.id}`, { method: 'DELETE' });
    assert.equal(delRes.status, 204);

    const afterDelete = await (await fetch(`${baseUrl}/api/sources`)).json();
    assert.equal(afterDelete.length, 0);
  } finally {
    server.close();
  }
});

test('POST /api/sources reports a duplicate instead of creating a second row for the same query', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const payload = { query: 'mahjong tile set', category: 'set' };
    await fetch(`${baseUrl}/api/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const secondRes = await fetch(`${baseUrl}/api/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(secondRes.status, 200);
    const body = await secondRes.json();
    assert.equal(body.duplicate, true);

    const all = await (await fetch(`${baseUrl}/api/sources`)).json();
    assert.equal(all.length, 1);
  } finally {
    server.close();
  }
});

test('POST /api/sources rejects an invalid category', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'mahjong tile set', category: 'gadget' }),
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});
