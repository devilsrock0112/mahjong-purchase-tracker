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

  const FIND_CATEGORIES = ['set', 'rack', 'clothing', 'mat', 'card-case', 'other'];

  app.get('/api/finds', async (req, res) => {
    try {
      res.json(await store.readFinds());
    } catch (e) {
      res.status(502).json({ error: 'Could not load finds right now' });
    }
  });

  app.post('/api/finds', async (req, res) => {
    const { name, category, price, originalPrice, onSale, saleReason, url, source, notes } = req.body ?? {};

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!FIND_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${FIND_CATEGORIES.join(', ')}` });
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ error: 'price must be a positive number' });
    }
    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'url is required' });
    }

    let numericOriginalPrice = null;
    if (originalPrice !== undefined && originalPrice !== null && originalPrice !== '') {
      numericOriginalPrice = Number(originalPrice);
      if (!Number.isFinite(numericOriginalPrice) || numericOriginalPrice <= 0) {
        return res.status(400).json({ error: 'originalPrice must be a positive number when provided' });
      }
    }

    try {
      const find = await store.addFind({
        name,
        category,
        price: numericPrice,
        originalPrice: numericOriginalPrice,
        onSale: Boolean(onSale),
        saleReason,
        url,
        source,
        notes,
      });
      if (!find) {
        return res.status(200).json({ duplicate: true, message: 'A find with this url already exists' });
      }
      res.status(201).json(find);
    } catch (e) {
      res.status(502).json({ error: 'Could not save find right now' });
    }
  });

  app.delete('/api/finds/:id', async (req, res) => {
    try {
      await store.deleteFind(req.params.id);
      res.status(204).end();
    } catch (e) {
      res.status(502).json({ error: 'Could not remove find right now' });
    }
  });

  app.get('/api/sources', async (req, res) => {
    try {
      res.json(await store.readSources());
    } catch (e) {
      res.status(502).json({ error: 'Could not load sources right now' });
    }
  });

  app.post('/api/sources', async (req, res) => {
    const { query, category, notes } = req.body ?? {};

    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'query is required' });
    }
    if (!FIND_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${FIND_CATEGORIES.join(', ')}` });
    }

    try {
      const source = await store.addSource({ query, category, notes });
      if (!source) {
        return res.status(200).json({ duplicate: true, message: 'This query is already saved' });
      }
      res.status(201).json(source);
    } catch (e) {
      res.status(502).json({ error: 'Could not save source right now' });
    }
  });

  app.delete('/api/sources/:id', async (req, res) => {
    try {
      await store.deleteSource(req.params.id);
      res.status(204).end();
    } catch (e) {
      res.status(502).json({ error: 'Could not remove source right now' });
    }
  });

  return app;
}

module.exports = { createApp };
