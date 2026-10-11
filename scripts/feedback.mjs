import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getDb, REPO_ROOT } from "./lib/db.mjs";
import { parseCsv, pick } from "./lib/csv.mjs";
import { table } from "./lib/format.mjs";
export const READS = {
  boards:
    "select b.id,b.name,count(i.id)::int as ideas from feedback.boards b left join feedback.ideas i on i.board_id=b.id group by b.id order by b.name",
  ideas:
    "select id,title,status,owner,category,effort,source_votes from feedback.ideas order by title",
  accounts:
    "select id,name,currency,mrr,renewal_on,segment from feedback.accounts order by name",
  attention: "select * from feedback.attention order by title",
  triage:
    "select id,title,owner,source_status from feedback.ideas where status in ('new','review') order by created_at",
  priorities:
    "select * from feedback.demand where status not in ('complete','declined') order by currency,mrr_per_effort desc,title",
  roadmap:
    "select id,title,status,owner,effort from feedback.ideas where status in ('planned','in-progress') order by status,title",
  promises:
    "select p.id,i.title,a.name as account,p.owner,p.due_on,p.state,p.due_on<current_date and p.state='open' as overdue from feedback.promises p join feedback.ideas i on i.id=p.idea_id join feedback.accounts a on a.id=p.account_id order by p.due_on",
  "close-loop": "select * from feedback.close_loop order by due_on",
  "renewal-risk":
    "select distinct a.name as account,a.currency,a.mrr,a.renewal_on,i.title,i.status from feedback.accounts a join feedback.support s on s.account_id=a.id join feedback.ideas i on i.id=s.idea_id where a.renewal_on between current_date and current_date+60 and i.status not in ('complete','declined') order by a.renewal_on,i.title",
  "owner-load":
    "select owner,count(*)::int as open_ideas,sum(effort)::int as effort from feedback.ideas where status not in ('complete','declined') group by owner order by effort desc",
  "unlinked-demand":
    "select id,title,source_votes,source_mrr from feedback.ideas i where not exists(select 1 from feedback.support s where s.idea_id=i.id) order by source_votes desc,title",
  duplicates:
    "select a.id,a.title,b.id as candidate_id,b.title as candidate from feedback.ideas a join feedback.ideas b on a.id<b.id where lower(a.title)=lower(b.title) or (length(a.title)>8 and (position(lower(a.title) in lower(b.title))>0 or position(lower(b.title) in lower(a.title))>0)) order by a.title",
  compliance: "select * from feedback.privacy_checks order by title,rule",
  history: "select * from feedback.history order by created_at desc limit 100",
};
export const WRITES = [
  "add-board",
  "add-account",
  "add",
  "assign",
  "support",
  "promise",
  "resolve-promise",
  "set-status",
  "review",
  "privacy",
  "log",
  "import",
];
export const COMMANDS = [
  ...Object.keys(READS),
  "idea",
  "search",
  ...WRITES,
  "export",
  "weekly-review",
  "draft-release",
  "help",
];
export function parse(args) {
  const o = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) o._.push(a);
    else {
      const eq = a.indexOf("=");
      const k = a.slice(2, eq < 0 ? undefined : eq);
      if (eq >= 0) o[k] = a.slice(eq + 1);
      else if (args[i + 1] && !args[i + 1].startsWith("--")) o[k] = args[++i];
      else o[k] = true;
    }
  }
  return o;
}
function need(o, k) {
  if (typeof o[k] !== "string" || !o[k].trim())
    throw Error(`--${k} is required`);
  return o[k].trim();
}
function integer(v, fallback = 0) {
  if (v === undefined || v === "") return fallback;
  if (!/^\d+$/.test(String(v))) throw Error("Expected nonnegative integer");
  const n = Number(v);
  if (!Number.isSafeInteger(n)) throw Error("Integer too large");
  return n;
}
function amount(v) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(v)))
    throw Error("Expected nonnegative amount with at most two decimals");
  return String(v);
}
export function date(v) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ||
    Number.isNaN(Date.parse(v)) ||
    new Date(v).toISOString().slice(0, 10) !== v
  )
    throw Error("Expected valid YYYY-MM-DD date");
  return v;
}
function bool(v) {
  if (!["true", "false"].includes(v)) throw Error("Expected true or false");
  return v === "true";
}
const entities = {
  boards: "name",
  ideas: "title",
  accounts: "name",
  promises: null,
};
async function resolve(db, entity, ref) {
  if (!ref) throw Error(`Missing ${entity} reference`);
  const col = entities[entity];
  const rows = await db.query(
    `select * from feedback.${entity} where id::text=$1 ${col ? `or lower(${col})=lower($1)` : ""}`,
    [ref],
  );
  if (rows.length === 1) return rows[0];
  const hits = rows.length
    ? rows
    : await db.query(
        `select * from feedback.${entity} where id::text ilike $1 ${col ? `or ${col} ilike $1` : ""} order by id`,
        [`${ref}%`],
      );
  if (hits.length !== 1)
    throw Error(
      `${hits.length ? "Ambiguous" : "No matching"} ${entity}: ${hits.map((r) => `${r.id} ${col ? r[col] : ""}`).join("; ")}`,
    );
  return hits[0];
}
async function audit(db, id, action, actor) {
  await db.query(
    "insert into feedback.history(entity_id,action,actor) values($1,$2,$3)",
    [id, action, actor],
  );
}
function outputFile(relative) {
  const base = path.resolve(process.env.OUTPUT_DIR || REPO_ROOT);
  const f = path.resolve(base, relative);
  if (!f.startsWith(base + path.sep))
    throw Error("Output must stay inside output directory");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  return f;
}
export function render(rows) {
  if (!Array.isArray(rows)) return JSON.stringify(rows, null, 2);
  if (!rows.length) return "  (none)";
  const keys = Object.keys(rows[0]);
  return table(
    rows,
    keys.map((key) => ({
      key,
      label: key,
      width: key === "id" || key.endsWith("_id") ? 8 : 55,
      format: (v) =>
        v instanceof Date
          ? v.toISOString()
          : typeof v === "object" && v !== null
            ? JSON.stringify(v)
            : v,
    })),
  );
}
function importRows(o) {
  const rows = parseCsv(fs.readFileSync(need(o, "file"), "utf8"));
  if (!rows.length) throw Error("CSV has no data rows");
  const seen = new Set();
  return rows.map((row, n) => {
    const title = pick(row, "Post Title", "Title");
    const url = pick(row, "Post URL", "URL");
    if (!title.trim() || !url.trim())
      throw Error(
        `Row ${n + 2}: Post Title and Post URL required; export Posts, not Ideas`,
      );
    let u;
    try {
      u = new URL(url);
    } catch {
      throw Error(`Row ${n + 2}: invalid Post URL`);
    }
    if (!["https:", "http:"].includes(u.protocol))
      throw Error("Post URL must use http or https");
    if (seen.has(url)) throw Error(`Duplicate Post URL: ${url}`);
    seen.add(url);
    const rawStatus = pick(row, "Post Status", "Status");
    const statuses = {
      open: "new",
      "under review": "review",
      planned: "planned",
      "in progress": "in-progress",
      complete: "complete",
      completed: "complete",
      closed: "declined",
    };
    const votes = integer(pick(row, "Score", "Score (Total Votes)", "Votes"));
    const comments = integer(pick(row, "Comment Count", "Comments"));
    const mrr = pick(row, "Associated MRR", "MRR");
    return {
      title,
      source_key: url,
      description: pick(row, "Post Detail", "Details", "Description"),
      status: statuses[rawStatus.toLowerCase()] || "review",
      source_status: rawStatus,
      owner: pick(row, "Post Owner", "Owner"),
      category: pick(row, "Category"),
      tags: pick(row, "Tags"),
      source_votes: votes,
      source_comments: comments,
      source_mrr: mrr ? amount(mrr) : null,
      source_row: row,
    };
  });
}
export async function execute(db, command, o = {}) {
  if (command === "help") return COMMANDS.map((command) => ({ command }));
  if (READS[command]) return db.query(READS[command]);
  if (command === "search")
    return db.query(
      "select id,title,status,owner from feedback.ideas where title ilike $1 or description ilike $1 order by title",
      [`%${need(o, "text")}%`],
    );
  if (command === "idea") {
    const i = await resolve(db, "ideas", need(o, "idea"));
    return {
      idea: i,
      support: await db.query(
        "select s.*,a.name,a.currency,a.mrr from feedback.support s join feedback.accounts a on a.id=s.account_id where idea_id=$1",
        [i.id],
      ),
      promises: await db.query(
        "select * from feedback.promises where idea_id=$1",
        [i.id],
      ),
      notes: await db.query(
        "select * from feedback.notes where idea_id=$1 order by created_at",
        [i.id],
      ),
    };
  }
  if (command === "export") {
    const snapshot = {
      format: "feedback-backup-v1",
      created: new Date().toISOString(),
    };
    for (const t of [
      "boards",
      "ideas",
      "accounts",
      "support",
      "promises",
      "notes",
      "history",
    ])
      snapshot[t] = await db.query(`select * from feedback.${t} order by id`);
    const file = outputFile(o.out || "exports/feedback.json");
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n", {
      flag: "wx",
    });
    return [
      {
        file,
        records: Object.values(snapshot)
          .filter(Array.isArray)
          .reduce((n, x) => n + x.length, 0),
      },
    ];
  }
  if (command === "weekly-review") {
    const sections = [];
    for (const c of [
      "attention",
      "priorities",
      "renewal-risk",
      "close-loop",
      "compliance",
    ])
      sections.push(`## ${c}\n\n${render(await execute(db, c))}`);
    const file = outputFile(`drafts/weekly-review-${Date.now()}.md`);
    fs.writeFileSync(
      file,
      "# Product review\n\nInternal draft. Fictional if using seed data.\n\n" +
        sections.join("\n\n"),
    );
    return [{ file }];
  }
  if (command === "draft-release") {
    const i = await resolve(db, "ideas", need(o, "idea"));
    if (i.status !== "complete")
      throw Error("Release draft requires complete idea");
    const rows = await db.query(
      "select a.name,p.owner,p.due_on from feedback.promises p join feedback.accounts a on a.id=p.account_id where p.idea_id=$1 and p.state='open'",
      [i.id],
    );
    const file = outputFile(`drafts/release-${i.id}-${Date.now()}.md`);
    fs.writeFileSync(
      file,
      `# Internal release follow-up draft\n\n${i.title}\n\n${i.description}\n\nVerify release availability and audience before preparing any external message. Nothing has been sent.\n\n${render(rows)}\n`,
    );
    return [{ file, accounts: rows.length }];
  }
  if (!WRITES.includes(command))
    throw Error(`Unknown command ${command}; use help`);
  const actor = need(o, "actor");
  await db.exec("BEGIN");
  try {
    let result, id;
    if (command === "add-board") {
      result = await db.query(
        "insert into feedback.boards(name) values($1) returning *",
        [need(o, "name")],
      );
      id = result[0].id;
    } else if (command === "add-account") {
      const currency = o.currency || "NZD";
      if (!/^[A-Z]{3}$/.test(currency))
        throw Error("Currency must be three uppercase letters");
      result = await db.query(
        "insert into feedback.accounts(name,currency,mrr,renewal_on,segment) values($1,$2,$3,$4,$5) returning *",
        [
          need(o, "name"),
          currency,
          amount(o.mrr || "0"),
          o.renewal ? date(o.renewal) : null,
          o.segment || "",
        ],
      );
      id = result[0].id;
    } else if (command === "add") {
      const b = await resolve(db, "boards", need(o, "board"));
      result = await db.query(
        "insert into feedback.ideas(board_id,title,description,owner,effort) values($1,$2,$3,$4,$5) returning *",
        [
          b.id,
          need(o, "title"),
          o.description || "",
          o.owner || "",
          integer(o.effort, 1),
        ],
      );
      id = result[0].id;
    } else if (command === "resolve-promise") {
      const p = await resolve(db, "promises", need(o, "promise"));
      const state = need(o, "state");
      if (!["fulfilled", "withdrawn"].includes(state))
        throw Error("State must be fulfilled or withdrawn");
      if (state === "fulfilled") {
        const i = await resolve(db, "ideas", p.idea_id);
        if (i.status !== "complete")
          throw Error("Idea must be complete before fulfilment");
      }
      result = await db.query(
        "update feedback.promises set state=$2,evidence=$3 where id=$1 returning *",
        [p.id, state, need(o, "evidence")],
      );
      id = p.id;
    } else if (command === "import") {
      if (o._?.[0] !== "canny")
        throw Error("Use import canny --file=posts.csv --board=name");
      const rows = importRows(o);
      const b = await resolve(db, "boards", need(o, "board"));
      let added = 0,
        skipped = 0,
        updated = 0;
      for (const r of rows) {
        const found = await db.query(
          "select * from feedback.ideas where source_key=$1",
          [r.source_key],
        );
        if (found.length) {
          if (
            JSON.stringify(found[0].source_row) !== JSON.stringify(r.source_row)
          ) {
            // JSONB normalises key order; compare values, not serialized order.
            const old = found[0].source_row;
            const same =
              Object.keys(old).length === Object.keys(r.source_row).length &&
              Object.keys(old).every((k) => old[k] === r.source_row[k]);
            if (!same) {
              if (!o.update)
                throw Error("Changed source row: use --update after review");
              await db.query(
                "update feedback.ideas set source_row=$2,source_votes=$3,source_comments=$4,source_mrr=$5,source_status=$6 where id=$1",
                [
                  found[0].id,
                  JSON.stringify(r.source_row),
                  r.source_votes,
                  r.source_comments,
                  r.source_mrr,
                  r.source_status,
                ],
              );
              await audit(
                db,
                found[0].id,
                "import source snapshot refreshed; local workflow preserved",
                actor,
              );
              updated++;
              continue;
            }
          }
          skipped++;
          continue;
        }
        const saved = await db.query(
          `insert into feedback.ideas(board_id,title,description,status,owner,category,tags,source_key,source_status,source_votes,source_comments,source_mrr,source_row,personal_data) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true) returning id`,
          [
            b.id,
            r.title,
            r.description,
            r.status,
            r.owner,
            r.category,
            r.tags,
            r.source_key,
            r.source_status,
            r.source_votes,
            r.source_comments,
            r.source_mrr,
            JSON.stringify(r.source_row),
          ],
        );
        await audit(db, saved[0].id, "import canny", actor);
        added++;
      }
      result = [
        {
          added,
          updated,
          skipped,
          dry_run: Boolean(o["dry-run"]),
          note: "Aggregate counts only; no voter identities, comments, attachments or live integrations imported.",
        },
      ];
    } else {
      const i = await resolve(db, "ideas", need(o, "idea"));
      id = i.id;
      if (command === "assign")
        result = await db.query(
          "update feedback.ideas set owner=$2 where id=$1 returning id,title,owner",
          [id, need(o, "owner")],
        );
      else if (command === "support") {
        const a = await resolve(db, "accounts", need(o, "account"));
        result = await db.query(
          "insert into feedback.support(idea_id,account_id,evidence) values($1,$2,$3) on conflict(idea_id,account_id) do update set evidence=excluded.evidence returning *",
          [id, a.id, need(o, "evidence")],
        );
      } else if (command === "promise") {
        const a = await resolve(db, "accounts", need(o, "account"));
        result = await db.query(
          "insert into feedback.promises(idea_id,account_id,owner,due_on) values($1,$2,$3,$4) returning *",
          [id, a.id, need(o, "owner"), date(need(o, "due"))],
        );
      } else if (command === "set-status") {
        const status = need(o, "status");
        if (
          ![
            "new",
            "review",
            "planned",
            "in-progress",
            "complete",
            "declined",
          ].includes(status)
        )
          throw Error("Invalid status");
        need(o, "note");
        result = await db.query(
          "update feedback.ideas set status=$2 where id=$1 returning id,title,status",
          [id, status],
        );
        await db.query(
          "insert into feedback.notes(idea_id,actor,body) values($1,$2,$3)",
          [id, actor, o.note],
        );
      } else if (command === "review") {
        result = await db.query(
          "update feedback.ideas set reviewed_on=current_date where id=$1 returning id,title,reviewed_on",
          [id],
        );
        await db.query(
          "insert into feedback.notes(idea_id,actor,body) values($1,$2,$3)",
          [id, actor, need(o, "note")],
        );
      } else if (command === "privacy") {
        const personal = bool(need(o, "personal-data"));
        const jurisdiction = o.jurisdiction || i.jurisdiction;
        if (!["NZ", "AU", "other"].includes(jurisdiction))
          throw Error("Jurisdiction must be NZ, AU or other");
        result = await db.query(
          "update feedback.ideas set personal_data=$2,jurisdiction=$3,app_entity=$4,purpose=$5,retention_review=$6,accuracy_review=$7 where id=$1 returning id,title,personal_data,jurisdiction,retention_review,accuracy_review",
          [
            id,
            personal,
            jurisdiction,
            o["app-entity"] === undefined
              ? i.app_entity
              : bool(o["app-entity"]),
            personal ? need(o, "purpose") : "",
            o.retention ? date(o.retention) : null,
            o.accuracy ? date(o.accuracy) : null,
          ],
        );
      } else if (command === "log")
        result = await db.query(
          "insert into feedback.notes(idea_id,actor,body) values($1,$2,$3) returning *",
          [id, actor, need(o, "note")],
        );
    }
    if (id) await audit(db, id, command, actor);
    await db.exec(o["dry-run"] ? "ROLLBACK" : "COMMIT");
    return result;
  } catch (e) {
    await db.exec("ROLLBACK");
    throw e;
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  let db;
  try {
    const [command = "help", ...args] = process.argv.slice(2);
    const o = parse(args);
    db = await getDb();
    const r = await execute(db, command, o);
    console.log(o.json ? JSON.stringify(r, null, 2) : render(r));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    if (db) await db.close();
  }
}
