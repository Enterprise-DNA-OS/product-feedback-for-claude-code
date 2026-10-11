import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getDb, REPO_ROOT } from "./lib/db.mjs";
import { migrate } from "./migrate.mjs";
import { seed } from "./seed.mjs";
import { execute, COMMANDS, READS, date, parse } from "./feedback.mjs";
import { parseCsv } from "./lib/csv.mjs";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "feedback-test-"));
process.env.DATA_DIR = path.join(tmp, "db");
process.env.OUTPUT_DIR = tmp;
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "";
let db;
const seen = new Set();
const run = async (c, o = {}) => {
  seen.add(c);
  return execute(db, c, { actor: "Test operator", ...o });
};
const child = (script, args = []) => {
  const r = spawnSync(
    process.execPath,
    [path.join(REPO_ROOT, "scripts", script), ...args],
    { cwd: REPO_ROOT, env: process.env, encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout;
};
try {
  db = await getDb();
  if (db.mode === "postgres")
    assert.equal(
      (await db.query("select to_regnamespace('feedback') as n"))[0].n,
      null,
      "Use an empty test database",
    );
  assert.equal((await migrate(db)).ran.length, 1);
  assert.equal((await migrate(db)).ran.length, 0);
  await seed(db);
  await seed(db);
  assert.equal((await run("ideas")).length, 5);
  for (const c of Object.keys(READS)) assert(Array.isArray(await run(c)), c);
  assert.equal((await run("attention")).length, 3);
  assert.equal((await run("close-loop")).length, 1);
  assert.equal((await run("compliance")).length, 2);
  assert.equal(
    Number(
      (await run("priorities")).find((r) => r.title === "Scheduled export")
        .linked_mrr,
    ),
    3700,
  );
  assert.equal((await run("search", { text: "export" })).length, 2);
  assert.equal(
    (await run("idea", { idea: "scheduled export" })).idea.title,
    "Scheduled export",
  );
  await assert.rejects(
    () => run("idea", { idea: "Scheduled" }),
    /Ambiguous.*Scheduled export/,
  );
  await assert.rejects(
    () => run("add-board", { name: "No actor", actor: "" }),
    /actor/,
  );
  await run("add-board", { name: "Imported" });
  await run("add-account", {
    name: "USD Buyer",
    currency: "USD",
    mrr: "100",
    renewal: "2027-01-10",
  });
  const [idea] = await run("add", {
    board: "Imported",
    title: "<script>alert(1)</script>",
    effort: "2",
  });
  await run("assign", { idea: idea.id, owner: "Aroha" });
  await run("support", {
    idea: "Scheduled export",
    account: "USD Buyer",
    evidence: "Fictional quote",
  });
  await run("support", {
    idea: "Scheduled export",
    account: "USD Buyer",
    evidence: "Repeated support",
  });
  const demand = await run("priorities");
  assert.equal(demand.filter((r) => r.title === "Scheduled export").length, 2);
  assert.equal(
    Number(
      demand.find((r) => r.title === "Scheduled export" && r.currency === "USD")
        .linked_mrr,
    ),
    100,
  );
  const [p] = await run("promise", {
    idea: idea.id,
    account: "USD Buyer",
    owner: "Aroha",
    due: "2027-01-10",
  });
  await assert.rejects(
    () =>
      run("resolve-promise", {
        promise: p.id,
        state: "fulfilled",
        evidence: "Acceptance",
      }),
    /complete/,
  );
  await assert.rejects(
    () => run("set-status", { idea: idea.id, status: "complete" }),
    /note/,
  );
  assert.equal((await run("idea", { idea: idea.id })).idea.status, "new");
  await run("set-status", {
    idea: idea.id,
    status: "complete",
    note: "Release tested",
  });
  await run("resolve-promise", {
    promise: p.id,
    state: "fulfilled",
    evidence: "Customer acceptance recorded",
  });
  await run("review", { idea: idea.id, note: "Confirmed field meaning" });
  await run("log", { idea: idea.id, note: "Release confirmed" });
  await run("privacy", {
    idea: idea.id,
    "personal-data": "true",
    jurisdiction: "AU",
    "app-entity": "true",
    purpose: "Research",
  });
  assert(
    (await run("compliance")).some(
      (r) => r.id === idea.id && r.rule === "AU-APP11.2",
    ),
  );
  await run("privacy", {
    idea: idea.id,
    "personal-data": "true",
    jurisdiction: "AU",
    "app-entity": "false",
    purpose: "Research",
  });
  assert(!(await run("compliance")).some((r) => r.id === idea.id));
  const file = path.join(REPO_ROOT, "examples/canny-posts.csv");
  const imp = { _: ["canny"], file, board: "Imported" };
  assert.equal((await run("import", { ...imp, "dry-run": true }))[0].added, 2);
  assert.equal((await run("ideas")).length, 6);
  assert.equal((await run("import", imp))[0].added, 2);
  assert.equal((await run("import", imp))[0].skipped, 2);
  const changed = path.join(tmp, "changed.csv");
  fs.writeFileSync(
    changed,
    fs
      .readFileSync(file, "utf8")
      .replace("Offline report", "Offline report amended"),
  );
  await assert.rejects(
    () => run("import", { ...imp, file: changed }),
    /Changed source row/,
  );
  assert.equal(
    (await run("import", { ...imp, file: changed, update: true }))[0].updated,
    1,
  );
  assert.equal(
    (await run("idea", { idea: "Offline report" })).idea.title,
    "Offline report",
  );
  const broken = path.join(tmp, "broken.csv");
  fs.writeFileSync(
    broken,
    "Post Title,Post URL,Score\nGood,https://example.test/new,1\nBad,https://example.test/bad,nope\n",
  );
  await assert.rejects(
    () => run("import", { ...imp, file: broken }),
    /integer/,
  );
  assert.equal((await run("search", { text: "Good" })).length, 0);
  fs.writeFileSync(
    broken,
    "Post Title,Post URL\nA,https://example.test/a\nB,https://example.test/a\n",
  );
  await assert.rejects(
    () => run("import", { ...imp, file: broken }),
    /Duplicate Post URL/,
  );
  assert.throws(() => parseCsv("a,a\n1,2"), /unique/);
  assert.throws(() => parseCsv('a,b\n"oops,2'), /unclosed/);
  assert.throws(() => date("2026-02-30"), /valid/);
  assert.equal(parse(["--json", "--text=hello"]).json, true);
  const [backup] = await run("export");
  const data = JSON.parse(fs.readFileSync(backup.file));
  for (const k of [
    "boards",
    "ideas",
    "accounts",
    "support",
    "promises",
    "notes",
    "history",
  ])
    assert(Array.isArray(data[k]));
  await assert.rejects(() => run("export"), /EEXIST/);
  const [weekly] = await run("weekly-review");
  assert(fs.readFileSync(weekly.file, "utf8").includes("renewal-risk"));
  const [draft] = await run("draft-release", { idea: "Usage digest" });
  assert(fs.readFileSync(draft.file, "utf8").includes("Nothing has been sent"));
  await assert.rejects(
    () => run("draft-release", { idea: "Scheduled export" }),
    /complete/,
  );
  await run("help");
  assert.deepEqual([...seen].sort(), [...COMMANDS].sort());
  await db.close();
  db = null;
  assert(JSON.parse(child("feedback.mjs", ["ideas", "--json"])).length === 8);
  const bad = spawnSync(
    process.execPath,
    [path.join(REPO_ROOT, "scripts/feedback.mjs"), "idea", "--idea=Scheduled"],
    { cwd: REPO_ROOT, env: process.env, encoding: "utf8" },
  );
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Ambiguous/);
  child("docs.mjs");
  child("view.mjs");
  const docs = fs.readdirSync(path.join(tmp, "docs-out/decision-pack"));
  assert.equal(docs.length, 8);
  const html = docs
    .map((f) =>
      fs.readFileSync(path.join(tmp, "docs-out/decision-pack", f), "utf8"),
    )
    .join("");
  assert(html.includes("&lt;script&gt;"));
  assert(!html.includes("<script>alert(1)</script>"));
  assert(
    fs
      .readFileSync(path.join(tmp, "views/week.html"), "utf8")
      .includes("Harbour Product Studio"),
  );
  console.log(
    `PASS: ${COMMANDS.length} CLI commands, atomic/idempotent imports, promise guards, currency separation, privacy scope, exports, drafts and escaped branded HTML`,
  );
} finally {
  if (db) await db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
