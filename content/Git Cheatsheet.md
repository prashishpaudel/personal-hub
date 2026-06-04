---
title: Git Cheatsheet
date: 2026-05-09
tags: [git, tools]
---

# Git Cheatsheet

## Remote & Branch Management

- `git fetch --prune` — remove local tracking references to deleted remote branches
- `git branch -d branch_name` — delete a local branch

## Fetching & Pulling

- `git fetch origin` — downloads latest changes from remote without touching your local code
  - See which branches have been updated
  - See how many commits you're behind
  - Your local code remains completely untouched

- `git pull origin main` — fetch + merge latest changes from main into your current branch
  - If already on main: `git pull origin` or just `git pull`

## Stashing

- `git stash save "WIP on main branch"` — save uncommitted changes temporarily
- `git stash list` — see all stashes
- `git stash pop` — apply most recent stash and remove it
- `git stash pop stash@{1}` — apply a specific stash

## Comparing & Reverting

- `git diff origin/development origin/staging` — compare two remote branches
- `git revert commitId` — undo a specific commit safely

---

## Merging a PR from Feature Branch to Staging

```bash
git fetch origin                          # Fetch latest changes from remote
git checkout staging                      # Switch to staging branch
git pull origin staging                   # Pull latest staging changes
git checkout <feature-branch-name>        # Switch to feature branch
git pull origin <feature-branch-name>     # Pull latest feature branch changes
git checkout staging                      # Switch back to staging
git merge <feature-branch-name>           # Merge feature into staging
# make changes to pubspec.yaml or other files if needed
git add .
git commit -m "commit message"
git push origin staging                   # Push to remote staging
```

---

## Writing Good Commit Messages

Use this format for detailed commits:

```bash
git commit -m "feat(reporting): short summary of change" \
  -m "- Detail line one
- Detail line two
- Detail line three"
```

**Example:**
```bash
git commit -m "feat(reporting): send report via new cloud function with video URL" \
  -m "Removed GlobalEventBus and local report storage
Added ReportContentService with API call to cloud function
Refactored ReportButton to use new reporting service"
```
