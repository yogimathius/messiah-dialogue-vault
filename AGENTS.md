# Agent Instructions - Messiah Dialogue Vault

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project-Specific Workflow

**IMPORTANT**: This project uses **atomic commits per bead, directly on main**. No pull requests.

### Per-Bead Workflow

For each bead you work on:

1. **Start the bead**
   ```bash
   bd start <bead-id>
   ```

2. **Implement the feature**
   - Write code for the bead
   - Test locally
   - Ensure no breaking changes

3. **Commit atomically**
   ```bash
   git add .
   git commit -m "feat: <bead-title> (<bead-id>)

   <description of what was implemented>

   Closes <bead-id>"
   ```

4. **Close the bead**
   ```bash
   bd close <bead-id>
   ```

5. **Push immediately**
   ```bash
   git push origin main
   ```

**Example commit message:**
```
feat: Build semantic search route with filters UI (messiah-dialogue-vault-cpk)

- Created /search route with semantic search
- Added filters for role, tags, date range
- Implemented result snippets with highlighting

Closes messiah-dialogue-vault-cpk
```

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd start <id>         # Start work (sets status to in_progress)
bd close <id>         # Complete work (sets status to closed)
bd list               # List all beads
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

