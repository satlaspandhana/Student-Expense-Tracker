const { createClient } = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const isConfigured = Boolean(url && key && !url.includes("your-project") && !key.includes("your-anon-key"));
const supabase = isConfigured ? createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { "X-Client-Info": "campuscash-student-expense-tracker" } }
}) : null;
module.exports = { supabase, isConfigured };
