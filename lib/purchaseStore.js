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
