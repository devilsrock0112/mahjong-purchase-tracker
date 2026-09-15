function validatePurchase({ date, item, price }) {
  if (typeof date !== 'string' || !date.trim()) {
    return { valid: false, error: 'date is required' };
  }
  if (typeof item !== 'string' || !item.trim()) {
    return { valid: false, error: 'item is required' };
  }
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return { valid: false, error: 'price must be a positive number' };
  }
  return { valid: true, date, item, price: numericPrice };
}

module.exports = { validatePurchase };
