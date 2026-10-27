import { createClient } from "@supabase/supabase-js";

export async function requireActiveUser(req) {
  const token = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || "")?.[1];
  if (!token) throw Object.assign(new Error("Accesso richiesto."), { statusCode: 401 });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw Object.assign(new Error("Autenticazione non configurata."), { statusCode: 503 });
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw Object.assign(new Error("Sessione non valida."), { statusCode: 401 });
  const { data: profile, error: profileError } = await client.from("profiles")
    .select("status").eq("id", data.user.id).maybeSingle();
  if (profileError || profile?.status !== "Attivo") {
    throw Object.assign(new Error("Account non abilitato."), { statusCode: 403 });
  }
  return { user: data.user, client };
}

export async function readJsonBody(req, limit = 4 * 1024 * 1024) {
  let raw;
  if (req.body !== undefined) {
    raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8")
      : typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  } else {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > limit) throw Object.assign(new Error("Payload troppo grande."), { statusCode: 413 });
      chunks.push(bytes);
    }
    raw = Buffer.concat(chunks).toString("utf8");
  }
  if (Buffer.byteLength(raw || "") > limit) throw Object.assign(new Error("Payload troppo grande."), { statusCode: 413 });
  let body;
  try { body = JSON.parse(raw); } catch {
    throw Object.assign(new Error("JSON non valido."), { statusCode: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw Object.assign(new Error("Oggetto JSON richiesto."), { statusCode: 400 });
  }
  return body;
}
