import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://nexus-progress-tracker-20261107.comfypin1.chatgpt.site",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

function respond(body: unknown, status = 200, origin = "") {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    },
  });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  if (request.method === "OPTIONS") return respond({}, 200, origin);
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405, origin);

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return respond({ error: "Sign in required" }, 401, origin);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return respond({ error: "Server is not configured" }, 500, origin);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return respond({ error: "Invalid session" }, 401, origin);
  const { data: profile } = await admin.from("profiles").select("role")
    .eq("user_id", user.id).single();
  if (profile?.role !== "admin") return respond({ error: "Admin access required" }, 403, origin);

  let input: Record<string, unknown>;
  try { input = await request.json(); }
  catch { return respond({ error: "Invalid request" }, 400, origin); }
  const teamId = input.team_id;
  if (typeof teamId !== "string" || !/^[0-9a-f-]{36}$/i.test(teamId))
    return respond({ error: "Valid team required" }, 400, origin);
  const { data: team, error: teamError } = await admin.from("teams")
    .select("id, leader_user_id").eq("id", teamId).single();
  if (teamError || !team) return respond({ error: "Team not found" }, 404, origin);

  if (input.action === "reset_password") {
    const password = input.password;
    if (!team.leader_user_id) return respond({ error: "Team has no leader account" }, 400, origin);
    if (typeof password !== "string" || password.length < 12)
      return respond({ error: "Password must have at least 12 characters" }, 400, origin);
    const { error } = await admin.auth.admin.updateUserById(team.leader_user_id, { password });
    return error ? respond({ error: "Could not reset password" }, 500, origin)
      : respond({ ok: true }, 200, origin);
  }

  if (input.action !== "create_leader")
    return respond({ error: "Unknown action" }, 400, origin);
  if (team.leader_user_id)
    return respond({ error: "Team already has a leader account" }, 409, origin);
  const username = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
  const displayName = typeof input.display_name === "string" ? input.display_name.trim() : "";
  const password = input.password;
  if (!/^[a-z0-9_.-]{3,32}$/.test(username) || !displayName || displayName.length > 120 ||
      typeof password !== "string" || password.length < 12)
    return respond({ error: "Check username, name and password" }, 400, origin);

  // A reserved .example address provides username/password login without email delivery.
  // Account recovery is deliberately admin managed in this MVP.
  const email = `${username}@leaders.nexus-tracker.example`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (createError || !created.user)
    return respond({ error: "Username unavailable or account could not be created" }, 409, origin);

  const userId = created.user.id;
  const { error: profileError } = await admin.from("profiles").insert({
    user_id: userId, username, display_name: displayName, role: "leader",
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return respond({ error: "Username unavailable" }, 409, origin);
  }
  const { data: linked, error: linkError } = await admin.from("teams")
    .update({ leader_user_id: userId, leader_name: displayName })
    .eq("id", teamId).is("leader_user_id", null).select("id").maybeSingle();
  if (linkError || !linked) {
    await admin.auth.admin.deleteUser(userId);
    return respond({ error: "Could not link leader to team" }, 409, origin);
  }
  return respond({ ok: true, user_id: userId }, 200, origin);
});
