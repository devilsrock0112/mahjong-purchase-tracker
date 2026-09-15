const { createApp } = require('./app');
const { createPurchaseStore } = require('./lib/jsonbinStore');

const PORT = process.env.PORT || 3000;
const binId = process.env.JSONBIN_BIN_ID;
const masterKey = process.env.JSONBIN_MASTER_KEY;

if (!binId || !masterKey) {
  console.error('Missing JSONBIN_BIN_ID or JSONBIN_MASTER_KEY environment variables.');
  process.exit(1);
}

const store = createPurchaseStore({ binId, masterKey });
const app = createApp(store);

app.listen(PORT, () => {
  console.log(`Mahjong Purchase Tracker (hosted) running on port ${PORT}`);
});
