const form = document.getElementById('purchase-form');
const rowsEl = document.getElementById('purchase-rows');
const totalEl = document.getElementById('total');
const errorEl = document.getElementById('error');

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.hidden = panel.id !== `tab-${btn.dataset.tab}`;
    });
  });
});

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

const findsRowsEl = document.getElementById('finds-rows');

const CATEGORY_LABELS = {
  set: 'Tile Set',
  rack: 'Rack',
  clothing: 'Clothing',
  mat: 'Mat',
  'card-case': 'Card Case',
  other: 'Other',
};

function renderFinds(finds) {
  findsRowsEl.innerHTML = '';
  if (!finds.length) {
    findsRowsEl.innerHTML = '<tr><td colspan="6" style="text-align:center; font-style:italic;">No finds yet — check back after the next search.</td></tr>';
    return;
  }

  const sorted = finds.slice().sort((a, b) => (a.foundDate < b.foundDate ? 1 : -1));
  for (const find of sorted) {
    const row = document.createElement('tr');
    const priceHtml = find.onSale && find.originalPrice
      ? `<span class="original-price">${formatMoney(find.originalPrice)}</span>${formatMoney(find.price)}<span class="sale-badge">Sale</span>`
      : formatMoney(find.price);
    const sourceHtml = find.url
      ? `<a href="${find.url}" target="_blank" rel="noopener">${find.source || 'Link'}</a>`
      : (find.source || '');

    row.innerHTML = `<td>${find.name}</td><td>${CATEGORY_LABELS[find.category] || find.category}</td><td>${priceHtml}</td><td>${sourceHtml}</td><td>${find.foundDate}</td>` +
      `<td><button class="remove-btn" data-id="${find.id}">Remove</button></td>`;
    findsRowsEl.appendChild(row);
  }
}

async function loadFinds() {
  const res = await fetch('/api/finds');
  renderFinds(await res.json());
}

findsRowsEl.addEventListener('click', async (event) => {
  const button = event.target.closest('.remove-btn');
  if (!button) return;
  if (!confirm('Remove this find?')) return;
  await fetch(`/api/finds/${button.dataset.id}`, { method: 'DELETE' });
  await loadFinds();
});

loadFinds();
