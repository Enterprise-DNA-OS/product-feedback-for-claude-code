# Product Feedback for Claude Code

Keep feedback, supporting accounts, customer promises and release follow-up in a database you own. The agent is the way you work with it. Built for a product owner who wants to run the weekly feedback review from their own records.

## Three ways to run it

- **Do it yourself.** MIT licensed. Install the free version, bring your Canny posts across and run it with Claude Code, Codex, OpenCode or Cursor. Database hosting and agent usage are yours to arrange.
- **We customise it.** Enterprise DNA brings your feedback across, adds your account fields, decision rules and any customer portal you need. One setup fee, then an agreed retainer for ongoing work.
- **We run it for you.** Omni by Enterprise DNA installs, connects, backs up and operates your version. One setup fee, then a monthly retainer. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=canny&utm_medium=readme).

## Start with fictional data

```bash
npm install
npm run demo
npm run feedback -- attention
npm run feedback -- priorities --json
npm run view
npm run docs
```

Requires Node 20 or newer. With DATABASE_URL unset, PGlite persists to .data/db. Set DATABASE_URL to a PostgreSQL connection for a hosted installation. Do not share a database owner credential with browsers. Records have row security enabled and public access revoked; a hosted installation needs its own reviewed access design. Use a fresh database for real imports, not the demo database.

## The weekly work

Triage requests, rank supported demand, review customer promises, check approaching renewals and close the loop on releases. Imported vote and revenue totals are source snapshots, never assumed to identify individual voters or accounts. Supported account revenue is counted once per idea and kept separate by currency. It is revenue associated with a request, not a forecast of revenue that building it will win.

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

Writes: /add-board, /add-account, /add, /assign, /support, /promise, /resolve-promise, /set-status, /review, /privacy, /log, /import. Every write requires --actor. Use /weekly-review and /draft-release for private drafts; /export for backups; /customise and /new-view for changes. /help lists CLI commands.

## Ten questions for your own feedback review

These are implemented today. Canny also offers analysis and custom fields; this is a list of our installed queries, not a claim that its platform cannot answer them.

- Which promises are overdue on ideas that have not shipped? `promises`
- Which near-term renewals depend on unresolved feedback? `renewal-risk`
- Which completed ideas still need customer follow-up? `close-loop`
- Which requests have source votes but no verified account evidence? `unlinked-demand`
- Which ideas have the most supported revenue per effort unit in each currency? `priorities`
- Who has the most open effort assigned? `owner-load`
- Which requests have no accountable owner? `attention`
- Which idea titles need a duplicate review before we estimate them? `duplicates`
- Which personal feedback records are overdue for retention review? `compliance`
- What did the operator change in the last review? `history`

## Your first hour: ten things to ask for

1. Put our business name and logo on the review pack.
2. Show the overdue customer promises.
3. Explain which upcoming renewals have unresolved requests.
4. Assign the unowned request to our product owner.
5. Compare supported demand without combining currencies.
6. Show imported feedback that still needs account mapping.
7. Draft the follow-up for a completed release.
8. Record the evidence from a customer acceptance call.
9. Add our product line field through a migration.
10. Test our Canny export before saving anything.

## Bring your Canny posts across

```bash
npm run migrate
npm run feedback -- add-board --name="Customer requests" --actor="Migration operator"
npm run feedback -- import canny --file=examples/canny-posts.csv --board="Customer requests" --actor="Migration operator" --dry-run
```

Remove --dry-run after checking. Use Canny's Posts export with Post Title and Post URL. Column aliases are documented in [the switch guide](docs/replace-canny.md). The newer Ideas export is a different format and is rejected. Repeat imports skip identical source records. Changed source records require --update, which refreshes source snapshots and aggregate counts while preserving your local title, description, owner and workflow. No voter identities, comment bodies, files or integrations are manufactured from counts.

## Documents and views

npm run docs writes a feedback decision pack per idea and a customer promise statement per account. npm run view writes private read-only weekly and privacy reports. Change brand.json to brand them. Drafts live in drafts/, printable HTML in docs-out/ and views/. Nothing sends, hosts a portal or changes data from a screen. [Why no front end](docs/why-no-front-end.md).

## Privacy checks

The checks flag NZ accuracy and retention review gaps and scoped Australian APP 11.2 review gaps. Review dates are business policies, not legal deadlines. Imports are conservatively marked as personal information and need classification. [Rules and primary sources](docs/compliance.md). This is a limited record review, not compliance certification or an automated disposal system.

## Validation

npm test creates a temporary database, migrates and seeds twice, exercises every CLI command, tests malformed and repeat imports, rollback, name ambiguity, promise guards, currency separation, privacy scope, exports, drafts and escaped HTML. The CI file runs on Linux, Windows and a separate PostgreSQL service. Local results and CI results are separate evidence.

MIT licence. Canny is a trademark of its owner. This project is independent of Canny.
