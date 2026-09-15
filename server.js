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
