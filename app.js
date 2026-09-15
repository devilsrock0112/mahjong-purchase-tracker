const path = require('node:path');
const express = require('express');

function createApp(store) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/purchases', async (req, res) => {
    try {
      res.json(await store.readPurchases());
    } catch (e) {
      res.status(502).json({ error: 'Could not load purchases right now' });
    }
  });

  app.post('/api/purchases', async (req, res) => {
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

    try {
      const purchase = await store.addPurchase({ date, item, price: numericPrice });
      res.status(201).json(purchase);
    } catch (e) {
      res.status(502).json({ error: 'Could not save purchase right now' });
    }
  });

  return app;
}

module.exports = { createApp };
