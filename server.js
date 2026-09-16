const path = require('node:path');
const { createApp } = require('./app');
const { createPurchaseStore } = require('./lib/purchaseStore');

const PORT = process.env.PORT || 3000;

const store = createPurchaseStore({
  purchasesFile: path.join(__dirname, 'data', 'purchases.json'),
  findsFile: path.join(__dirname, 'data', 'finds.json'),
  sourcesFile: path.join(__dirname, 'data', 'sources.json'),
});
const app = createApp(store);

app.listen(PORT, () => {
  console.log(`Mahjong Purchase Tracker running at http://localhost:${PORT}`);
});
