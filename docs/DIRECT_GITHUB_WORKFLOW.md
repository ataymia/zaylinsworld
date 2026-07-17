# Zaylins Direct GitHub Workflow

Effective: 2026-07-17

This file overrides any older roadmap language that recommends pull requests for routine Zaylins development.

## Working rule

- Do not create new pull requests unless Mia explicitly requests one.
- ChatGPT performs the coding, file updates, commits, validation, and branch synchronization directly through GitHub.
- Do not delegate implementation to a coding agent.
- Keep changes small, phase-labeled, and reviewable by commit.
- Run the existing quality checks after functional changes.
- Do not claim a visual fix is complete until Mia confirms it in the deployed game.

## Branch handling

- `main` is the deployed and authoritative game history.
- `agent/starter-town-construction` may remain as a synchronized construction pointer, but it must not contain competing or stale work.
- Asset Lab commits on `main` must be preserved when gameplay code is updated.
- After direct gameplay commits to `main`, fast-forward the construction pointer to the same approved head.

## Safety

- Never overwrite unrelated Asset Lab or world-design work.
- Never force-update a branch unless a normal fast-forward is impossible and Mia has approved the recovery.
- Never merge or open a pull request automatically.
