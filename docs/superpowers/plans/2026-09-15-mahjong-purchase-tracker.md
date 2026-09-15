# Mahjong Purchase Expense Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone local web app for logging Mahjong merchandise purchases (date, item, price) with a running total, so the user has a simple expense log — no sales, no inventory, no CRM integration.

**Architecture:** A tiny Node.js + Express server serves one static page and a small JSON API (`GET /api/purchases`, `POST /api/purchases`). All data lives in a single local `data/purchases.json` file, written atomically (write to `.tmp`, then rename) so a crash mid-write can't corrupt it. No database, no auth, no external services.

**Tech Stack:** Node.js (22.x, matching the sibling Pung Intended CRM project), Express, built-in `node:test` + `node:assert` for tests (no test framework dependency), vanilla HTML/CSS/JS for the frontend (no build step, no framework).

**Spec:** Design approved in chat during brainstorming (2026-09-15) — see conversation. No separate spec file; requirements are captured in this plan's Global Constraints below.

## Global Constraints

- Standalone project — lives in its own folder, `Pung Intended/Mahjong Purchase Tracker/`, unrelated to and not integrated with the Pung Intended CRM app.
- Fields captured per purchase: **date, item, price only** — no vendor, no notes, no category.
- Storage: single local JSON file, no database engine (matches "expense tracking, manual entry only" requirement — no need for SQL, indexing, or multi-user concurrency).
- No authentication, no external API integrations (no Shopify/Square/etc. — purely manual entry).
- Runs locally via `npm start`; the user opens `http://localhost:3000` in a browser.
- Per the user's standing Finder-hygiene preference: once built, only a single double-clickable launcher (`Start Mahjong Tracker.command`) stays visible in Finder — every other file (source, `package.json`, `node_modules`, `data/`, `docs/`, `tests/`) is hidden via `chflags hidden`, which hides the item in Finder without touching any file path, `require`, or `npm` behavior.

---

## File Structure

```
Pung Intended/Mahjong Purchase Tracker/
├── Start Mahjong Tracker.command   # visible launcher (Task 6)
├── package.json                    # hidden
├── server.js                       # hidden — entry point, wires store + app + listen
├── lib/
│   └── purchaseStore.js            # hidden — JSON read/write, atomic write
├── app.js                          # hidden — creates the Express app (routes + static)
├── public/
│   ├── index.html                  # hidden — form + table + total
│   └── app.js                      # hidden — frontend fetch logic
├── data/
│   └── purchases.json              # hidden — created at first run
├── tests/
│   ├── purchaseStore.test.js       # hidden
│   └── app.test.js                 # hidden
└── docs/                           # hidden — this plan
    └── superpowers/plans/2026-09-15-mahjong-purchase-tracker.md
```

- `lib/purchaseStore.js` owns all file I/O — nothing else touches `data/purchases.json` directly. This is the only place atomic-write logic lives.
- `app.js` owns HTTP routing and validation — it depends on a store (dependency-injected) so tests can point it at a temp file instead of the real data file.
- `server.js` is the only file that wires the real data file path and calls `.listen()` — kept separate so `app.js` stays testable without starting a real server on a real port.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore` (ignore `node_modules/`, `data/`)

**Interfaces:**
- Produces: an `npm start` script (`node server.js`) and an `npm test` script (`node --test tests/`) that later tasks rely on.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "mahjong-purchase-tracker",
  "version": "1.0.0",
  "private": true,
  "description": "Local expense tracker for Mahjong merchandise purchases",
  "main": "server.js",
  "engines": {
    "node": "22.x"
  },
  "scripts": {
    "start": "node server.js",
    "test": "node --test tests/"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
data/
```

- [ ] **Step 3: Install dependencies**

Run: `cd "Pung Intended/Mahjong Purchase Tracker" && npm install`
Expected: `node_modules/` created, `package-lock.json` created, no errors.

- [ ] **Step 4: Commit**

There is no git repo in this folder yet and none is required for a personal local tool — skip commit for this task. (If the user later asks for version control here, `git init` first.)

---

### Task 2: Purchase store (data layer)

**Files:**
- Create: `lib/purchaseStore.js`
- Test: `tests/purchaseStore.test.js`

**Interfaces:**
- Produces: `createPurchaseStore(filePath)` → `{ readPurchases(): Purchase[], addPurchase({date, item, price}): Purchase }`, where `Purchase = { id: number, date: string, item: string, price: number }`.
- Consumes: nothing (pure Node `fs`/`path`).

- [ ] **Step 1: Write the failing tests**

```js
// tests/purchaseStore.test.js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "Pung Intended/Mahjong Purchase Tracker" && npm test`
Expected: FAIL — `Cannot find module '../lib/purchaseStore'`

- [ ] **Step 3: Implement `lib/purchaseStore.js`**

```js
const fs = require('node:fs');
const path = require('node:path');

function createPurchaseStore(filePath) {
  function readPurchases() {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) {
      return [];
    }
    return JSON.parse(raw);
  }

  function writePurchases(purchases) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmpFile = `${filePath}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(purchases, null, 2));
    fs.renameSync(tmpFile, filePath);
  }

  function addPurchase({ date, item, price }) {
    const purchases = readPurchases();
    const purchase = { id: Date.now(), date, item, price };
    purchases.push(purchase);
    writePurchases(purchases);
    return purchase;
  }

  return { readPurchases, addPurchase };
}

module.exports = { createPurchaseStore };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "Pung Intended/Mahjong Purchase Tracker" && npm test`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

Skip (no git repo in this folder; see Task 1 Step 4 note).

---

### Task 3: Express app with purchases API

**Files:**
- Create: `app.js`
- Test: `tests/app.test.js`

**Interfaces:**
- Consumes: `createPurchaseStore(filePath)` from Task 2 (`{ readPurchases, addPurchase }`).
- Produces: `createApp(store)` → an Express app with:
  - `GET /api/purchases` → `200`, JSON array of purchases.
  - `POST /api/purchases` with JSON body `{date, item, price}` → `201`, JSON of the created purchase, or `400` with `{error: string}` if `date`/`item` are missing/empty or `price` is not a positive number.
  - Static file serving of `public/` at `/`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/app.test.js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "Pung Intended/Mahjong Purchase Tracker" && npm test`
Expected: FAIL — `Cannot find module '../app'`

- [ ] **Step 3: Implement `app.js`**

```js
const path = require('node:path');
const express = require('express');

function createApp(store) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/purchases', (req, res) => {
    res.json(store.readPurchases());
  });

  app.post('/api/purchases', (req, res) => {
    const { date, item, price } = req.body ?? {};

    if (typeof date !== 'string' || !date.trim()) {
      return res.status(400).json({ error: 'date is required' });
    }
    if (typeof item !== 'string' || !item.trim()) {
      return res.status(400).json({ error: 'item is required' });
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ error: 'price must be a positive number' });
    }

    const purchase = store.addPurchase({ date, item, price: numericPrice });
    res.status(201).json(purchase);
  });

  return app;
}

module.exports = { createApp };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "Pung Intended/Mahjong Purchase Tracker" && npm test`
Expected: PASS — all tests from Task 2 and Task 3 green.

- [ ] **Step 5: Commit**

Skip (no git repo in this folder; see Task 1 Step 4 note).

---

### Task 4: Server entry point

**Files:**
- Create: `server.js`

**Interfaces:**
- Consumes: `createApp(store)` from Task 3, `createPurchaseStore(filePath)` from Task 2.
- Produces: a running HTTP server on `process.env.PORT || 3000`, backed by `data/purchases.json`.

- [ ] **Step 1: Implement `server.js`**

```js
const path = require('node:path');
const { createApp } = require('./app');
const { createPurchaseStore } = require('./lib/purchaseStore');

const DATA_FILE = path.join(__dirname, 'data', 'purchases.json');
const PORT = process.env.PORT || 3000;

const store = createPurchaseStore(DATA_FILE);
const app = createApp(store);

app.listen(PORT, () => {
  console.log(`Mahjong Purchase Tracker running at http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Manually verify the server starts**

Run: `cd "Pung Intended/Mahjong Purchase Tracker" && npm start`
Expected: Console prints `Mahjong Purchase Tracker running at http://localhost:3000` with no errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

Skip (no git repo in this folder; see Task 1 Step 4 note).

---

### Task 5: Frontend page

**Files:**
- Create: `public/index.html`
- Create: `public/app.js`

**Interfaces:**
- Consumes: `GET /api/purchases` and `POST /api/purchases` from Task 3.

- [ ] **Step 1: Implement `public/index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Mahjong Purchase Tracker</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
    form { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    input { padding: 0.4rem; font-size: 1rem; }
    input[name="item"] { flex: 1; min-width: 150px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.4rem; border-bottom: 1px solid #ddd; }
    tfoot td { font-weight: bold; }
    #error { color: #b00020; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>Mahjong Purchase Tracker</h1>
  <form id="purchase-form">
    <input type="date" name="date" required>
    <input type="text" name="item" placeholder="Item" required>
    <input type="number" name="price" placeholder="Price" step="0.01" min="0.01" required>
    <button type="submit">Add</button>
  </form>
  <p id="error" hidden></p>
  <table>
    <thead>
      <tr><th>Date</th><th>Item</th><th>Price</th></tr>
    </thead>
    <tbody id="purchase-rows"></tbody>
    <tfoot>
      <tr><td colspan="2">Total</td><td id="total">$0.00</td></tr>
    </tfoot>
  </table>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Implement `public/app.js`**

```js
const form = document.getElementById('purchase-form');
const rowsEl = document.getElementById('purchase-rows');
const totalEl = document.getElementById('total');
const errorEl = document.getElementById('error');

function formatMoney(amount) {
  return `$${amount.toFixed(2)}`;
}

function render(purchases) {
  rowsEl.innerHTML = '';
  let total = 0;
  for (const purchase of purchases) {
    total += purchase.price;
    const row = document.createElement('tr');
    row.innerHTML = `<td>${purchase.date}</td><td>${purchase.item}</td><td>${formatMoney(purchase.price)}</td>`;
    rowsEl.appendChild(row);
  }
  totalEl.textContent = formatMoney(total);
}

async function loadPurchases() {
  const res = await fetch('/api/purchases');
  render(await res.json());
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.hidden = true;

  const formData = new FormData(form);
  const payload = {
    date: formData.get('date'),
    item: formData.get('item'),
    price: Number(formData.get('price')),
  };

  const res = await fetch('/api/purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json();
    errorEl.textContent = body.error;
    errorEl.hidden = false;
    return;
  }

  form.reset();
  await loadPurchases();
});

loadPurchases();
```

- [ ] **Step 3: Manually verify in a browser**

Run: `cd "Pung Intended/Mahjong Purchase Tracker" && npm start`, then open `http://localhost:3000`.
Expected: Form is visible; adding a purchase (date, item, price) shows it in the table immediately and the total updates; refreshing the page keeps the entries (confirms they persisted to `data/purchases.json`).

- [ ] **Step 4: Commit**

Skip (no git repo in this folder; see Task 1 Step 4 note).

---

### Task 6: Launcher + Finder hygiene

**Files:**
- Create: `Start Mahjong Tracker.command`

**Interfaces:**
- Consumes: `npm start` (Task 4).

- [ ] **Step 1: Create the launcher script**

```bash
#!/bin/bash
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  npm install
fi
npm start &
sleep 1
open http://localhost:3000
wait
```

- [ ] **Step 2: Make it executable and double-clickable**

Run: `chmod +x "Pung Intended/Mahjong Purchase Tracker/Start Mahjong Tracker.command"`

- [ ] **Step 3: Manually verify the launcher**

Double-click `Start Mahjong Tracker.command` in Finder.
Expected: A Terminal window opens, the server starts, and the default browser opens to `http://localhost:3000` with the tracker page.

- [ ] **Step 4: Hide everything except the launcher**

Run:
```bash
cd "Pung Intended/Mahjong Purchase Tracker"
chflags hidden package.json package-lock.json server.js app.js lib public tests data docs node_modules .gitignore
```
Expected: `ls -la` still lists every file (nothing moved or deleted), but Finder shows only `Start Mahjong Tracker.command` inside the `Mahjong Purchase Tracker` folder.

- [ ] **Step 5: Commit**

Skip (no git repo in this folder; see Task 1 Step 4 note).

---

## Self-Review Notes

- **Spec coverage:** date/item/price-only form (Task 5), running total (Task 5), single JSON file with atomic write (Task 2), no DB/auth/integrations (no tasks introduce any), standalone folder (file structure), Finder hygiene (Task 6) — all covered.
- **Type consistency:** `Purchase = {id, date, item, price}` is used identically in `purchaseStore.js`, `app.js`, and `public/app.js`. `createPurchaseStore`/`createApp` signatures match between where they're defined (Tasks 2–3) and where they're consumed (Tasks 3–4).
- **No placeholders:** every step has complete, runnable code or an exact command.
