import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("profile grants prevent self promotion, reactivation and deletion; suspended users lose data access", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role authenticated; create role anon; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select current_setting('request.jwt.claim.sub', true)::uuid $$;
      grant usage on schema auth to authenticated;
      insert into auth.users values ('00000000-0000-0000-0000-000000000001');`);
    const initial = (await readFile(new URL("../supabase/migrations/20260720150614_initial_fenix_backend.sql", import.meta.url), "utf8"))
      .replace("create extension if not exists pgcrypto with schema extensions;", "");
    await db.exec(initial);
    await db.exec(await readFile(new URL("../supabase/migrations/20261023201115_secure_profile_authority.sql", import.meta.url), "utf8"));
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
      insert into public.profiles(id,email,full_name) values (auth.uid(),'test@example.invalid','Test');
      update public.profiles set full_name = 'Updated' where id = auth.uid();`);
    for (const sql of ["update public.profiles set role = 'TITOLARE'", "update public.profiles set status = 'Attivo'", "delete from public.profiles"])
      await assert.rejects(db.exec(sql), /permission denied/);
    await db.exec(`insert into public.contacts(user_id,name) values (auth.uid(),'Test');`);
    assert.equal((await db.query("select * from public.contacts")).rows.length, 1);
    for (let count = 0; count < 10; count++) {
      assert.equal((await db.query("select public.consume_generation_quota() as allowed")).rows[0].allowed, true);
    }
    assert.equal((await db.query("select public.consume_generation_quota() as allowed")).rows[0].allowed, false);
    await assert.rejects(db.exec("delete from private.ai_daily_usage"), /permission denied/);
    await db.exec("reset role; update public.profiles set status = 'Sospeso'; set role authenticated;");
    assert.equal((await db.query("select * from public.contacts")).rows.length, 0);
    await assert.rejects(db.exec("insert into public.contacts(user_id,name) values (auth.uid(),'Denied')"), /row-level security/);
  } finally { await db.close(); }
});
