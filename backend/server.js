import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = "./db.json";

function readDB() {
  const data = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(data);
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ✅ Health check
app.get("/", (req, res) => {
  res.json({ message: "SmartSpend Backend Running ✅" });
});

// ✅ Get all transactions
app.get("/api/transactions", (req, res) => {
  const db = readDB();
  res.json(db.transactions);
});

// ✅ Add transaction
app.post("/api/transactions", (req, res) => {
  const { type, amount, merchant, category, date, mode } = req.body;

  if (!type || !amount || !merchant || !category || !date || !mode) {
    return res.status(400).json({ error: "All fields required" });
  }

  const db = readDB();
  const newTxn = {
    id: Date.now().toString(),
    type,
    amount: Number(amount),
    merchant,
    category,
    date,
    mode,
    createdAt: new Date().toISOString()
  };

  db.transactions.push(newTxn);
  writeDB(db);

  res.status(201).json(newTxn);
});

// ✅ Delete transaction
app.delete("/api/transactions/:id", (req, res) => {
  const { id } = req.params;

  const db = readDB();
  const before = db.transactions.length;
  db.transactions = db.transactions.filter(t => t.id !== id);

  if (db.transactions.length === before) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  writeDB(db);
  res.json({ message: "Deleted ✅" });
});

// ✅ AI Insights (Rule-based fallback)
app.post("/api/insights", (req, res) => {
  const { transactions } = req.body;

  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ error: "transactions array required" });
  }

  let totalDebit = 0;
  let totalCredit = 0;
  const categorySpend = {};

  transactions.forEach(t => {
    if (t.type === "debit") {
      totalDebit += Number(t.amount);
      categorySpend[t.category] = (categorySpend[t.category] || 0) + Number(t.amount);
    } else {
      totalCredit += Number(t.amount);
    }
  });

  const balance = totalCredit - totalDebit;

  // Find top category
  let topCategory = "None";
  let topAmount = 0;
  for (const c in categorySpend) {
    if (categorySpend[c] > topAmount) {
      topAmount = categorySpend[c];
      topCategory = c;
    }
  }

  const tips = [];
  if (totalDebit > 5000) tips.push("⚠️ Your total spending is high this period. Consider setting a weekly limit.");
  if (topCategory !== "None") tips.push(`📌 Highest spending category: ${topCategory} (₹${topAmount}).`);
  if (balance < 0) tips.push("❗ Your expenses are greater than income. Try reducing non-essential spends.");

  res.json({
    summary: {
      totalCredit,
      totalDebit,
      balance
    },
    topCategory,
    tips
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
