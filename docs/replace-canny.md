# Switch from Canny

## Export

In Canny, open Settings, Boards, then Export Data, or filter Posts on the Feedback page and use its download button. Use an unfiltered export for a complete board. Keep the original file unchanged. [Canny's export instructions](https://help.canny.io/en/articles/3889198-exporting-feedback), checked 11 October 2026.

Choose **Posts**, not the newer Ideas view export. [Ideas exports](https://help.canny.io/en/articles/14728321-exporting-feedback-ideas) have different fields and aggregate insight counts. They need a reviewed mapping before import.

## Import

```bash
npm run migrate
npm run feedback -- add-board --name="Customer requests" --actor="Migration operator"
npm run feedback -- import canny --file="posts.csv" --board="Customer requests" --actor="Migration operator" --dry-run
```

Review the counts, then remove --dry-run. Use one board per import. The entire file commits or rolls back together. Post URL is the stable source key across boards. Duplicate URLs inside one file are rejected. Repeat imports skip identical rows; --update refreshes source snapshots, source status and aggregate counts, preserving local titles, descriptions, owners and workflow. Deliberately apply any needed local changes after review.

| Source column                                    | Stored meaning                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Post Title or Title                              | Required idea title                                                            |
| Post URL or URL                                  | Required stable source key                                                     |
| Post Detail, Details or Description              | Description                                                                    |
| Post Status or Status                            | Normalised workflow plus original source status                                |
| Score, Score (Total Votes) or Votes              | Source vote total                                                              |
| Comment Count or Comments                        | Source comment total                                                           |
| Post Owner or Owner                              | Owner text                                                                     |
| Tags; Category                                   | Source labels                                                                  |
| Associated MRR or MRR                            | Numeric source snapshot; currency unknown, excluded from local revenue ranking |
| Every column, including images, author and dates | Original text retained in the source row                                       |

Open becomes new, Under Review becomes review, Planned stays planned, In Progress becomes in-progress, Complete/Completed becomes complete, Closed becomes declined. Unrecognised statuses become review and retain their original text. Source timestamps are retained as text; imported rows get the local import time. Numbers use plain digits and an optional decimal point for MRR. Currency symbols or separators in numeric fields are rejected so the operator can review them.

## Reconcile before leaving

Match post counts, titles, source vote counts and every status against the source export. Link supporting business accounts only from verified evidence. Compare revenue in each currency. Imported vote totals do not identify voters. Comment counts do not include comment bodies. Image URLs do not download files. Canny documents separate voter exports; this importer does not map them. Preserve comments and files separately and scope their migration before cancelling.

A board's posts can be tested and loaded in one day with this command. A complete operational switch depends on voter mapping, private history, files, integrations and any portal the business needs. Enterprise DNA scopes those into the installed version. No live connection or automatic customer communication is included in the free base.

Export your new system with npm run feedback -- export --out=exports/feedback.json. This is a full JSON archive, not a tested one-command restore. Keep database backups and verify your recovery procedure before production.
