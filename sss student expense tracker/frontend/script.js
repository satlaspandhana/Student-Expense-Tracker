const API_BASE = "http://localhost:3000/api";
const CATEGORIES = ["Food", "Transport", "Education", "Shopping", "Entertainment", "Health", "Other"];
const CATEGORY_META = {
  Food: { icon: "🍜" }, Transport: { icon: "🚌" }, Education: { icon: "📚" },
  Shopping: { icon: "🛍️" }, Entertainment: { icon: "🎧" }, Health: { icon: "💊" }, Other: { icon: "✦" }
};
const state = { expenses: [], budget: 0, editingId: null, loading: false };
const $ = (selector) => document.querySelector(selector);
const currency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const monthKey = (date) => String(date || "").slice(0, 7);
const thisMonthExpenses = () => state.expenses.filter((item) => monthKey(item.date) === localDate().slice(0, 7));

function showNotice(message, isError = false) {
  const notice = $("#notice");
  notice.textContent = message;
  notice.classList.toggle("error", isError);
  notice.hidden = false;
}
function clearNotice() { $("#notice").hidden = true; }
function showFormStatus(message, isError = false) {
  const el = $("#form-status");
  el.textContent = message;
  el.classList.toggle("error", isError);
}
async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
  } catch {
    throw new Error("Cannot reach the backend. Start the server in the backend folder and try again.");
  }
  let body;
  try { body = await response.json(); } catch { body = {}; }
  if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.");
  return body;
}
function setLoading(isLoading) {
  state.loading = isLoading;
  const button = $("#submit-expense");
  button.disabled = isLoading;
  button.innerHTML = isLoading ? "Saving…" : (state.editingId ? "Update expense <span>↗</span>" : "Save expense <span>↗</span>");
}
function renderDashboard() {
  const monthItems = thisMonthExpenses();
  const spent = monthItems.reduce((sum, item) => sum + Number(item.amount), 0);
  const remaining = state.budget - spent;
  $("#current-month").textContent = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  $("#total-spent").textContent = currency(spent);
  $("#total-budget").textContent = currency(state.budget);
  $("#remaining-budget").textContent = currency(remaining);
  $("#transaction-count").textContent = monthItems.length;
  $("#budget-foot").textContent = state.budget > 0 ? `${Math.round((spent / state.budget) * 100)}% of your budget used` : "Set a budget to get started";
  $("#remaining-foot").textContent = remaining < 0 ? `${currency(Math.abs(remaining))} over budget` : "Your spending room";
  const percent = state.budget > 0 ? Math.min(100, (spent / state.budget) * 100) : 0;
  $("#budget-progress").style.width = `${percent}%`;
  $("#hero-balance").textContent = Math.max(0, remaining).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  $("#hero-budget").textContent = state.budget ? currency(state.budget) : "Set your budget";
  $("#hero-progress").style.width = `${percent}%`;
  $("#budget-check-title").textContent = !state.budget ? "Start with a simple budget" : remaining < 0 ? "You’re over your budget" : remaining < state.budget * .2 ? "You’re getting close to your limit" : "You’re on track";
  $("#budget-check-copy").textContent = !state.budget ? "Choose a monthly amount that feels realistic for you." : remaining < 0 ? `You have spent ${currency(Math.abs(remaining))} more than your monthly plan.` : `${currency(Math.max(0, remaining))} left for the rest of this month.`;
  $("#budget-check-btn").textContent = state.budget ? "Adjust monthly budget →" : "Set monthly budget →";
  const groups = {};
  monthItems.forEach((item) => { groups[item.category] = (groups[item.category] || 0) + Number(item.amount); });
  const categories = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const breakdown = $("#category-breakdown");
  if (!categories.length) {
    breakdown.innerHTML = '<div class="empty-inline">Add an expense to see your breakdown.</div>';
  } else {
    const max = categories[0][1] || 1;
    breakdown.innerHTML = categories.slice(0, 5).map(([category, amount]) => `
      <div class="category-row"><span class="category-emoji">${CATEGORY_META[category]?.icon || "✦"}</span>
      <div><div class="category-name">${escapeHTML(category)}</div><div class="category-track"><span style="width:${(amount / max) * 100}%"></span></div></div>
      <span class="category-amount">${currency(amount)}</span></div>`).join("");
  }
}
function filteredExpenses() {
  const query = $("#search-input").value.trim().toLowerCase();
  const category = $("#category-filter").value;
  const sort = $("#sort-filter").value;
  const items = state.expenses.filter((item) => {
    const text = `${item.title} ${item.note || ""} ${item.category}`.toLowerCase();
    return (!query || text.includes(query)) && (!category || item.category === category);
  });
  items.sort((a, b) => {
    if (sort === "oldest") return a.date.localeCompare(b.date);
    if (sort === "highest") return Number(b.amount) - Number(a.amount);
    if (sort === "lowest") return Number(a.amount) - Number(b.amount);
    return b.date.localeCompare(a.date) || String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });
  return items;
}
function renderTransactions() {
  const items = filteredExpenses();
  const tbody = $("#transactions-body");
  $("#results-count").textContent = `Showing ${items.length} transaction${items.length === 1 ? "" : "s"}`;
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-message">${state.expenses.length ? "No expenses match your search. Try another filter." : "No expenses yet. Add your first expense below."}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((item) => `<tr>
    <td><div class="expense-cell"><span class="expense-icon">${CATEGORY_META[item.category]?.icon || "✦"}</span><span><span class="expense-title">${escapeHTML(item.title)}</span>${item.note ? `<span class="expense-note">${escapeHTML(item.note)}</span>` : ""}</span></div></td>
    <td><span class="category-pill">${escapeHTML(item.category)}</span></td>
    <td class="date-cell">${new Date(`${item.date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
    <td class="amount-cell">${currency(item.amount)}</td>
    <td class="actions-col"><div class="row-actions"><button class="icon-button" type="button" data-action="edit" data-id="${escapeHTML(item.id)}" aria-label="Edit ${escapeHTML(item.title)}" title="Edit">✎</button><button class="icon-button delete" type="button" data-action="delete" data-id="${escapeHTML(item.id)}" aria-label="Delete ${escapeHTML(item.title)}" title="Delete">×</button></div></td>
  </tr>`).join("");
}
function render() { renderDashboard(); renderTransactions(); }
function clearErrors() { ["title", "amount", "category", "date"].forEach((field) => $(`#${field}-error`).textContent = ""); }
function validateForm() {
  clearErrors();
  let valid = true;
  const title = $("#expense-title").value.trim();
  const amount = Number($("#expense-amount").value);
  const category = $("#expense-category").value;
  const date = $("#expense-date").value;
  if (!title || title.length > 100) { $("#title-error").textContent = "Enter a title (up to 100 characters)."; valid = false; }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) { $("#amount-error").textContent = "Enter an amount between ₹0.01 and ₹1 crore."; valid = false; }
  if (!CATEGORIES.includes(category)) { $("#category-error").textContent = "Choose a valid category."; valid = false; }
  if (!date || date > localDate()) { $("#date-error").textContent = "Choose a valid date (today or earlier)."; valid = false; }
  return valid;
}
function resetExpenseForm() {
  $("#expense-form").reset();
  $("#expense-id").value = "";
  $("#expense-date").value = localDate();
  state.editingId = null;
  $("#form-title").textContent = "Add an expense";
  $("#cancel-edit").hidden = true;
  clearErrors();
  showFormStatus("");
  setLoading(false);
}
async function loadData() {
  clearNotice();
  $("#transactions-body").innerHTML = '<tr><td colspan="5" class="table-message">Loading transactions…</td></tr>';
  try {
    const [expenseData, budgetData] = await Promise.all([apiRequest("/expenses"), apiRequest("/budget")]);
    state.expenses = expenseData.data || [];
    state.budget = Number(budgetData.data?.amount || 0);
    render();
  } catch (error) {
    state.expenses = [];
    state.budget = 0;
    render();
    showNotice(`${error.message} Make sure you have configured backend/.env and run database/schema.sql in Supabase.`, true);
  }
}
function openBudgetDialog() {
  $("#budget-amount").value = state.budget || "";
  $("#budget-status").textContent = "";
  $("#budget-status").classList.remove("error");
  $("#budget-dialog").showModal();
  $("#budget-amount").focus();
}
async function saveBudget(event) {
  event.preventDefault();
  const amount = Number($("#budget-amount").value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000000) {
    $("#budget-status").textContent = "Enter a budget from ₹0 to ₹10 crore.";
    $("#budget-status").classList.add("error");
    return;
  }
  const button = $("#save-budget");
  button.disabled = true; button.textContent = "Saving…";
  try {
    const result = await apiRequest("/budget", { method: "PUT", body: JSON.stringify({ amount }) });
    state.budget = Number(result.data.amount);
    renderDashboard();
    $("#budget-dialog").close();
    showNotice("Your monthly budget has been saved.");
  } catch (error) {
    $("#budget-status").textContent = error.message;
    $("#budget-status").classList.add("error");
  } finally { button.disabled = false; button.textContent = "Save budget"; }
}
async function submitExpense(event) {
  event.preventDefault();
  if (!validateForm()) return;
  const payload = { title: $("#expense-title").value.trim(), amount: Number($("#expense-amount").value), category: $("#expense-category").value, date: $("#expense-date").value, note: $("#expense-note").value.trim() || null };
  setLoading(true); showFormStatus("");
  try {
    const editing = Boolean(state.editingId);
    const result = await apiRequest(editing ? `/expenses/${encodeURIComponent(state.editingId)}` : "/expenses", { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
    if (editing) state.expenses = state.expenses.map((item) => item.id === state.editingId ? result.data : item);
    else state.expenses.unshift(result.data);
    resetExpenseForm(); render(); showNotice(editing ? "Expense updated successfully." : "Expense saved successfully.");
    $("#transactions").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { showFormStatus(error.message, true); setLoading(false); }
}
function startEdit(id) {
  const item = state.expenses.find((expense) => String(expense.id) === String(id));
  if (!item) { showNotice("That expense could not be found. Refresh and try again.", true); return; }
  state.editingId = item.id;
  $("#expense-id").value = item.id;
  $("#expense-title").value = item.title;
  $("#expense-amount").value = item.amount;
  $("#expense-category").value = item.category;
  $("#expense-date").value = item.date;
  $("#expense-note").value = item.note || "";
  $("#form-title").textContent = "Edit an expense";
  $("#cancel-edit").hidden = false;
  $("#submit-expense").innerHTML = "Update expense <span>↗</span>";
  showFormStatus("");
  $("#add-expense").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#expense-title").focus({ preventScroll: true });
}
async function deleteExpense(id) {
  const item = state.expenses.find((expense) => String(expense.id) === String(id));
  if (!item || !window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
  try {
    await apiRequest(`/expenses/${encodeURIComponent(id)}`, { method: "DELETE" });
    state.expenses = state.expenses.filter((expense) => String(expense.id) !== String(id));
    render(); showNotice("Expense deleted.");
  } catch (error) { showNotice(error.message, true); }
}
function init() {
  $("#expense-date").value = localDate();
  $("#expense-form").addEventListener("submit", submitExpense);
  $("#cancel-edit").addEventListener("click", resetExpenseForm);
  $("#search-input").addEventListener("input", renderTransactions);
  $("#category-filter").addEventListener("change", renderTransactions);
  $("#sort-filter").addEventListener("change", renderTransactions);
  $("#transactions-body").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "edit") startEdit(button.dataset.id);
    if (button.dataset.action === "delete") deleteExpense(button.dataset.id);
  });
  ["#edit-budget-btn", "#budget-check-btn"].forEach((selector) => $(selector).addEventListener("click", openBudgetDialog));
  $("#budget-form").addEventListener("submit", saveBudget);
  ["#close-budget", "#cancel-budget"].forEach((selector) => $(selector).addEventListener("click", () => $("#budget-dialog").close()));
  $("#budget-dialog").addEventListener("click", (event) => { if (event.target === $("#budget-dialog")) $("#budget-dialog").close(); });
  loadData();
}
document.addEventListener("DOMContentLoaded", init);
