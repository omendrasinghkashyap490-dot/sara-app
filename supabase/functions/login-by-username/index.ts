import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  let username = "";
  let password = "";
  try {
    const body = await request.json();
    username = String(body.username || "").trim().replace(/^@/, "").toLowerCase();
    password = String(body.password || "");
  } catch {
    return jsonResponse({ error: "Invalid login details." }, 400);
  }
  if (!/^[a-z0-9_.]{3,30}$/.test(username) || password.length < 6) {
    return jsonResponse({ error: "Incorrect username or password." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Username login is not configured." }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (!profile) return jsonResponse({ error: "Incorrect username or password." }, 401);

  const { data: authResult } = await admin.auth.admin.getUserById(profile.id);
  const email = authResult.user?.email;
  if (!email) return jsonResponse({ error: "Incorrect username or password." }, 401);

  const auth = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.session) return jsonResponse({ error: "Incorrect username or password." }, 401);

  return jsonResponse({ session: data.session });
});