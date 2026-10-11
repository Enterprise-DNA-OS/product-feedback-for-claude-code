# import

Read CLAUDE.md and the relevant records first. Confirm the actual operator and inputs from the request. Example:

```bash
npm run feedback -- import canny --file=examples/canny-posts.csv --board="Customer requests" --dry-run --actor="Operator name"
```

Replace example values with verified facts. Read back the changed record and history. All writes are transactional. Imports and any --dry-run changes roll back. A completed idea does not prove customer acceptance. Never send or publish.
