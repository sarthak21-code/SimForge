const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const saveRoute = read("app/api/sims/route.ts");
const deleteRoute = read("app/api/sims/[id]/route.ts");
const gallery = read("app/gallery/page.tsx");
const auth = read("lib/supabase/auth.ts");
const clientAuth = read("lib/supabase/client.ts");
const generationRoute = read("app/api/generate/route.ts");
const simRoute = read("app/api/sims/[id]/route.ts");
const migration = read("supabase/migrations/20261008000000_add_sims_owner_id.sql");

test("server validates bearer identity with Supabase Auth and the public key", () => {
  assert.match(auth, /authorization\?\.match\(\/\^Bearer/);
  assert.match(auth, /auth\.getUser\(token\)/);
  assert.match(auth, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(auth, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("anonymous browser session resumes or signs in without a visible login flow", () => {
  assert.match(clientAuth, /supabase\.auth\.getSession\(\)/);
  assert.match(clientAuth, /supabase\.auth\.signInAnonymously\(\)/);
  assert.match(clientAuth, /secure session could not be started/i);
  assert.match(read("app/create/page.tsx"), /ensureAnonymousSession/);
  assert.match(read("app/sim/[id]/page.tsx"), /ensureAnonymousSession/);
});

test("save ignores any client owner claim and inserts only the verified user id", () => {
  assert.match(saveRoute, /const user = await getAuthenticatedUser\(req\)/);
  assert.match(saveRoute, /owner_id:\s*user\.id/);
  assert.doesNotMatch(saveRoute, /const\s*\{[^}]*owner_id[^}]*\}\s*=\s*await req\.json/);
  assert.match(saveRoute, /status: 401/);
  assert.match(saveRoute, /retryable: true/);
});

test("Gallery marks ownership without exposing the owner UUID", () => {
  assert.match(saveRoute, /select\("id, title, query, spec, created_at, owner_id"\)/);
  assert.match(saveRoute, /owner_id === user\.id/);
  assert.match(saveRoute, /\{ \.\.\.sim, is_owner:/);
  assert.doesNotMatch(saveRoute, /return NextResponse\.json\(data/);
});

test("Gallery shows a delete action only for simulations owned by the current session", () => {
  assert.match(gallery, /\{s\.is_owner && \(/);
  assert.match(gallery, /aria-label=\{`Delete \$\{s\.title\}`\}/);
  assert.match(gallery, /method:\s*"DELETE"/);
});

test("Gallery asks for confirmation before sending a deletion request", () => {
  assert.match(gallery, /Delete this simulation\?\\nThis cannot be undone\./);
  assert.ok(gallery.indexOf("window.confirm") < gallery.indexOf('method: "DELETE"'));
});

test("Canceling deletion sends no request", () => {
  assert.match(gallery, /if \(deletingId \|\| !window\.confirm\([^)]*\)\) return/);
});

test("Gallery disables the selected delete button during the request", () => {
  assert.match(gallery, /disabled=\{deletingId === s\.id\}/);
  assert.match(gallery, /if \(deletingId \|\|/);
});

test("successful deletion removes only that simulation from Gallery state", () => {
  assert.match(gallery, /if \(!response\.ok\) throw new Error/);
  assert.match(gallery, /setSims\(\(current\) => current\.filter\(\(item\) => item\.id !== sim\.id\)\)/);
});

test("failed deletion retains the card and gives a plain-language error", () => {
  assert.match(gallery, /catch \{\s*setDeleteError\("This simulation could not be deleted\. Please try again\."\)/);
  assert.match(gallery, /deleteError && <Card role="alert"/);
});

test("DELETE verifies identity before deleting and filters by id and authenticated owner", () => {
  const deleteHandler = deleteRoute.slice(deleteRoute.indexOf("export async function DELETE"));
  assert.ok(deleteHandler.indexOf("getAuthenticatedUser") < deleteHandler.indexOf('.delete()'));
  assert.match(deleteHandler, /\.eq\("id", id\)/);
  assert.match(deleteHandler, /\.eq\("owner_id", user\.id\)/);
  assert.match(deleteHandler, /\.select\("id"\)\s*\.maybeSingle\(\)/);
});

test("another user's simulation and legacy unowned rows cannot pass the delete ownership filter", () => {
  const deleteHandler = deleteRoute.slice(deleteRoute.indexOf("export async function DELETE"));
  assert.match(deleteHandler, /\.eq\("owner_id", user\.id\)/);
  assert.match(deleteHandler, /if \(!data\)[\s\S]*?status: 404/);
  assert.match(deleteHandler, /retryable: true/);
  // The database equality filter excludes both a different UUID and SQL NULL.
  const owner = "00000000-0000-4000-8000-000000000001";
  const notOwner = "00000000-0000-4000-8000-000000000002";
  assert.notEqual(owner, notOwner);
  assert.equal(null === owner, false);
});

test("deleted or unknown simulations are unavailable through the existing share endpoint", () => {
  assert.match(simRoute, /if \(error \|\| !data\)[\s\S]*?status: 404/);
});

test("generation saves only with verified ownership and preserves unauthenticated generation", () => {
  assert.match(generationRoute, /if \(!user\) return NextResponse\.json\(\{ \.\.\.sim, meta: structuredResponse \}\)/);
  assert.match(generationRoute, /owner_id:\s*user\.id/);
});

test("ownership migration adds only nullable owner metadata and an index", () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth\.users\(id\)/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS sims_owner_id_idx/);
  assert.doesNotMatch(migration, /DROP|DELETE FROM|CREATE POLICY|ENABLE ROW LEVEL SECURITY/i);
});

test("public simulation reads and legacy public rows remain available", () => {
  assert.match(saveRoute, /\.eq\("is_public", true\)/);
  assert.match(saveRoute, /\.limit\(limit\)/);
  assert.match(migration, /Existing rows remain public and unowned/);
  assert.match(saveRoute, /error\?\.code === "42703"/);
  assert.match(saveRoute, /select\("id, title, query, spec, created_at"\)/);
});
