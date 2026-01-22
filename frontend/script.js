const API_BASE = "http://localhost:5000"; // change after deploying backend

const txnForm = document.getElementById("txnForm");
const txnTable = document.getElementById("txnTable");

const balanceText = document.getElementById("balanceText");
const creditText = document.getElementById("creditText");
const debitText = document.getElementById("debitText");

const typeEl = document.getElementById("type");
const amountEl = document.getElementById("amount");
const merchantEl = document.getElementById("merchant");
const categoryEl = document.getElementById("category");
const dateEl = document.getElementById("date");
const modeEl = document.getElementById("mode");

const searchEl = document.getElementById("search");
const filterTypeEl = document.getElementById("filterType");

const exportBtn = document.getElementById("exportBtn");
const insightsBtn = document.getElementById("insightsBtn");

const insightsCard = document.getElementById("insightsCard");
const insightsText = document.getElementById("insightsText");
const closeInsights = document.getElementById("closeInsights");

dateEl.valueAsDate = new Date();

const formatMoney = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

async function fetchTxns() {
  const res = await fetch(`${API_BASE}/api/transactions`);
  return await res.json();
}

function calcStats(txns) {
  let credit = 0, debit = 0;
  txns.forEach(t => {
    if (t.type === "credit") credit += Number(t.amount);
    else debit += Number(t.amount);
  });
  return { credit, debit, balance: credit - debit };
}

function renderStats(txns) {
  const { credit, debit, balance } = calcStats(txns);
  balanceText.textContent = formatMoney(balance);
  creditText.textContent = formatMoney(credit);
  debitText.textContent = formatMoney(debit);
}

function renderTable(txns) {
  txnTable.innerHTML = "";

  if (txns.length === 0) {
    txnTable.innerHTML = `<tr><td colspan="6" style="opacity:0.7;">No transactions yet ✅</td></tr>`;
    return;
  }

  txns.forEach(t => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${t.date}</td>
      <td>${t.merchant}</td>
      <td>${t.category}</td>
      <td style="font-weight:800;">${t.type.toUpperCase()}</td>
      <td style="font-weight:800;">${formatMoney(t.amount)}</td>
      <td><button class="btn secondary" data-id="${t.id}">Delete</button></td>
    `;
    txnTable.appendChild(row);
  });
}

async function refresh() {
  let txns = await fetchTxns();

  // Filter & Search
  const q = searchEl.value.toLowerCase().trim();
  const ft = filterTypeEl.value;

  if (q) {
    txns = txns.filter(t =>
      t.merchant.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }

  if (ft !== "all") {
    txns = txns.filter(t => t.type === ft);
  }

  renderStats(txns);
  renderTable(txns);
}

txnForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    type: typeEl.value,
    amount: Number(amountEl.value),
    merchant: merchantEl.value,
    category: categoryEl.value,
    date: dateEl.value,
    mode: modeEl.value
  };

  await fetch(`${API_BASE}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  txnForm.reset();
  dateEl.valueAsDate = new Date();
  typeEl.value = "credit";

  refresh();
});

txnTable.addEventListener("click", async (e) => {
  if (e.target.tagName === "BUTTON") {
    const id = e.target.getAttribute("data-id");
    await fetch(`${API_BASE}/api/transactions/${id}`, { method: "DELETE" });
    refresh();
  }
});

searchEl.addEventListener("input", refresh);
filterTypeEl.addEventListener("change", refresh);

exportBtn.addEventListener("click", async () => {
  const txns = await fetchTxns();
  const blob = new Blob([JSON.stringify(txns, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.json";
  a.click();

  URL.revokeObjectURL(url);
});

insightsBtn.addEventListener("click", async () => {
  insightsCard.style.display = "block";
  insightsText.textContent = "Loading insights...";

  const txns = await fetchTxns();

  const res = await fetch(`${API_BASE}/api/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions: txns })
  });

  const data = await res.json();

  insightsText.textContent =
    `Total Credit: ₹${data.summary.totalCredit}\n` +
    `Total Debit: ₹${data.summary.totalDebit}\n` +
    `Balance: ₹${data.summary.balance}\n\n` +
    `Top Category: ${data.topCategory}\n\n` +
    `Tips:\n- ${data.tips.join("\n- ")}`;
});

closeInsights.addEventListener("click", () => {
  insightsCard.style.display = "none";
});

refresh();
