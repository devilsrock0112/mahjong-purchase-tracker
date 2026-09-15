const BASE_URL = 'https://api.jsonbin.io/v3/b';

function createPurchaseStore({ binId, masterKey }) {
  async function readPurchases() {
    const res = await fetch(`${BASE_URL}/${binId}/latest`, {
      headers: { 'X-Master-Key': masterKey },
    });
    if (!res.ok) {
      throw new Error(`Failed to read purchases (status ${res.status})`);
    }
    const body = await res.json();
    return body.record.purchases || [];
  }

  async function addPurchase({ date, item, price }) {
    const purchases = await readPurchases();
    const purchase = { id: Date.now(), date, item, price };
    purchases.push(purchase);

    const res = await fetch(`${BASE_URL}/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': masterKey,
      },
      body: JSON.stringify({ purchases }),
    });
    if (!res.ok) {
      throw new Error(`Failed to save purchase (status ${res.status})`);
    }
    return purchase;
  }

  return { readPurchases, addPurchase };
}

module.exports = { createPurchaseStore };
