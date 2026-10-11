# Product Feedback for Claude Code

The demo company is fictional Harbour Product Studio. Real operator, product and priorities come from the installer. Never use demo records as customer evidence.

- Read the matching .claude/commands recipe. Every runtime uses npm run feedback -- <command>.
- Read records before advising or changing them. Resolve ambiguous names by listing candidates and using a full id.
- Every write needs --actor. Changes run in transactions. Do not run concurrent embedded writers.
- Never send, publish, contact anyone, spend money or delete records. Drafts remain in drafts/. Recording fulfilment requires evidence of acceptance, not just a release.
- Source vote totals are not voter identities. Source MRR is a snapshot of unknown currency; never add it to verified account MRR. Compare account revenue within currencies only.
- Imported personal information requires classification, a lawful purpose and business review dates. Read docs/compliance.md before interpreting flags. The free version checks recorded review gaps, not all privacy duties.
- Use /customise for schema or rule changes. Back up first. Never edit an applied migration.
- Protect database credentials and exports. Never commit secrets or real records.
- Run npm test on disposable data. TEST_DATABASE_URL must identify a fresh empty test database.
- Stay on main. Commit authorised changes. Never change repository visibility.

## Files

scripts/feedback.mjs is the domain CLI. supabase/migrations holds database changes. scripts/lib/db.mjs selects PostgreSQL or PGlite. views.json, documents.json and brand.json define private reports. docs/replace-canny.md defines the import contract.

## Commands

- /boards: List boards and their idea counts.
- /ideas: List ideas and source vote totals.
- /accounts: Read customer revenue, currency and renewal dates.
- /attention: Read unassigned ideas, overdue promises and stale reviews.
- /triage: Review new and unreviewed feedback.
- /priorities: Rank linked recurring revenue per effort within each currency.
- /roadmap: Review planned work and work in progress.
- /promises: Check customer promises and overdue dates.
- /close-loop: Find completed work still awaiting customer follow-up.
- /renewal-risk: Find unresolved requests for accounts renewing within 60 days.
- /owner-load: Review open ideas and effort by owner.
- /unlinked-demand: Find feedback without verified supporting accounts.
- /duplicates: Review title matches; never automatically merge.
- /compliance: Review privacy control prompts with their source links.
- /history: Read the last 100 recorded changes.
- /idea: Read --idea with supporting accounts, promises and notes.
- /search: Find --text in titles and descriptions.

- /add-board: --name="Mobile product" --actor="Operator"
- /add-account: --name="Example Co" --currency=NZD --mrr=1200 --renewal=2027-01-15 --segment=growth --actor="Operator"
- /add: --board="Customer requests" --title="Export options" --owner=Mere --effort=2 --actor="Operator"
- /assign: --idea="Scheduled export" --owner=Mere --actor="Operator"
- /support: --idea="Scheduled export" --account="Kauri Software" --evidence="Confirmed request in account review" --actor="Operator"
- /promise: --idea="Contact preference" --account="Kauri Software" --owner=Mere --due=2027-01-15 --actor="Operator"
- /resolve-promise: --promise=<id> --state=fulfilled --evidence="Customer acceptance recorded" --actor="Operator"
- /set-status: --idea="Scheduled export" --status=planned --note="Scope agreed in review" --actor="Operator"
- /review: --idea="Scheduled export" --note="Reconfirmed scope and owner" --actor="Operator"
- /privacy: --idea="Contact preference" --personal-data=true --jurisdiction=NZ --purpose="Product feedback review" --retention=2027-01-15 --accuracy=2027-01-15 --actor="Operator"
- /log: --idea="Scheduled export" --note="Account review completed" --actor="Operator"
- /import: canny --file=examples/canny-posts.csv --board="Customer requests" --dry-run --actor="Operator"

- /export: Write a full backup. Run npm run feedback -- export --out=exports/feedback.json. Existing files are never overwritten. Protect backups as personal information.
- /weekly-review: Run attention, priorities, renewal-risk, close-loop and compliance. Then npm run feedback -- weekly-review. Read the draft and explain overdue promises before suggesting new work.
- /draft-release: Run npm run feedback -- draft-release --idea="Usage digest". Inspect the internal draft. Confirm release availability and audience. Never send it or mark promises fulfilled just because a draft exists.
- /help: Run npm run feedback -- help. Every CLI command accepts --json.
- /customise: Back up first. Read the schema and tests. Write the next numbered migration for the requested field, stage or rule. Update the CLI, relevant report and documentation. Apply to a disposable database, run npm test, then apply to the working database only within the authorised change. Never edit an applied migration.
- /new-view: Read views.json and the SQL views. Add a read-only query and its report sections. Run npm run view. Check HTML escaping and private information. No action buttons or server.
