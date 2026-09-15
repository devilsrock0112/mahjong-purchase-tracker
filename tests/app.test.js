const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../app');
const { createPurchaseStore } = require('../lib/purchaseStore');

function startTestServer() {
  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mpt-app-')), 'purchases.json');
  const store = createPurchaseStore(filePath);
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
