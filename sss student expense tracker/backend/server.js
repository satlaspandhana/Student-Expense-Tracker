require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { supabase, isConfigured } = require("./supabase");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5500";
const CATEGORIES = ["Food", "Transport", "Education", "Shopping", "Entertainment", "Health", "Other"];
app.disable("x-powered-by");
app.use(cors({ origin: ALLOWED_ORIGIN.split(",").map((origin) => origin.trim()), methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json({ limit: "20kb" }));

function validateExpense(body) {
  const errors = [];
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const amount = Number(body.amount);
  const category = body.category;
  const date = body.date;
  const note = body.note == null ? null : (typeof body.note === "string" ? body.note.trim() : "__INVALID__");
  if (!title || title.length > 100) errors.push("Title is required and must be at most 100 characters.");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) errors.push("Amount must be greater than 0 and no more than 10000000.");
  if (!CATEGORIES.includes(category)) errors.push("Choose a valid category.");
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isRealDate(date) || date > localToday()) errors.push("Date must be a valid date that is not in the future.");
  if (note === "__INVALID__" || (note && note.length > 250)) errors.push("Note must be text up to 250 characters.");
  return { errors, data: { title, amount, category, date, note } };
}
function localToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: process.env.APP_TIME_ZONE || "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function isRealDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validId(value) { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function requireDatabase(req, res, next) {
  if (!isConfigured) return res.status(503).json({ error: "Database is not configured. Copy backend/.env.example to backend/.env and add your Supabase URL and anon key." });
  next();
}
function handleDbError(res, error) {
  console.error("Database operation failed:", error.message || error);
  return res.status(500).json({ error: "The database operation failed. Check Supabase setup and server logs." });
}
app.get("/api/health", (req, res) => res.json({ status: "ok", databaseConfigured: isConfigured, service: "student-expense-tracker-api" }));
app.get("/api/expenses", requireDatabase, async (req, res) => {
  try {
    let query = supabase.from("expenses").select("id,title,amount,category,date,note,created_at,updated_at").order("date", { ascending: false }).order("created_at", { ascending: false });
    if (req.query.category) {
      if (!CATEGORIES.includes(req.query.category)) return res.status(400).json({ error: "Invalid category filter." });
      query = query.eq("category", req.query.category);
    }
    const { data, error } = await query;
    if (error) return handleDbError(res, error);
    res.json({ data });
  } catch (error) { handleDbError(res, error); }
});
app.post("/api/expenses", requireDatabase, async (req, res) => {
  const validation = validateExpense(req.body || {});
  if (validation.errors.length) return res.status(400).json({ error: validation.errors.join(" "), details: validation.errors });
  try {
    const { data, error } = await supabase.from("expenses").insert(validation.data).select("id,title,amount,category,date,note,created_at,updated_at").single();
    if (error) return handleDbError(res, error);
    res.status(201).json({ data });
  } catch (error) { handleDbError(res, error); }
});
app.put("/api/expenses/:id", requireDatabase, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: "Expense ID is invalid." });
  const validation = validateExpense(req.body || {});
  if (validation.errors.length) return res.status(400).json({ error: validation.errors.join(" "), details: validation.errors });
  try {
    const { data, error } = await supabase.from("expenses").update({ ...validation.data, updated_at: new Date().toISOString() }).eq("id", req.params.id).select("id,title,amount,category,date,note,created_at,updated_at").maybeSingle();
    if (error) return handleDbError(res, error);
    if (!data) return res.status(404).json({ error: "Expense not found." });
    res.json({ data });
  } catch (error) { handleDbError(res, error); }
});
app.delete("/api/expenses/:id", requireDatabase, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: "Expense ID is invalid." });
  try {
    const { data, error } = await supabase.from("expenses").delete().eq("id", req.params.id).select("id").maybeSingle();
    if (error) return handleDbError(res, error);
    if (!data) return res.status(404).json({ error: "Expense not found." });
    res.json({ message: "Expense deleted." });
  } catch (error) { handleDbError(res, error); }
});
app.get("/api/budget", requireDatabase, async (req, res) => {
  try {
    const { data, error } = await supabase.from("monthly_budget").select("id,amount,updated_at").eq("id", 1).maybeSingle();
    if (error) return handleDbError(res, error);
    res.json({ data: data || { id: 1, amount: 0, updated_at: null } });
  } catch (error) { handleDbError(res, error); }
});
app.put("/api/budget", requireDatabase, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000000) return res.status(400).json({ error: "Budget must be between 0 and 100000000." });
  try {
    const { data, error } = await supabase.from("monthly_budget").upsert({ id: 1, amount, updated_at: new Date().toISOString() }, { onConflict: "id" }).select("id,amount,updated_at").single();
    if (error) return handleDbError(res, error);
    res.json({ data });
  } catch (error) { handleDbError(res, error); }
});
app.use((req, res) => res.status(404).json({ error: "API route not found." }));
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ error: "Request body must contain valid JSON." });
  console.error("Unexpected server error:", error);
  res.status(500).json({ error: "Unexpected server error." });
});
app.listen(PORT, () => console.log(`CampusCash API listening at http://localhost:${PORT} (database configured: ${isConfigured})`));
