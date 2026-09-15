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
