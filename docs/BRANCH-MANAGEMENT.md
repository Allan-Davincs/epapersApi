# Branch management for Epapers

This workspace contains two independent Git repositories. `EpapersApi` contains the backend; `userFrontend` contains the frontend. Changing a branch in one does not switch the other. `Apitester` is a separate local Postman workspace.

At the time this guide was written, the complete backend was on `backend/phase-8-handover`, and the frontend was on `main`. Check the names yourself before starting work; an older backend branch may lack catalogue, moderation, JWT changes, or SMTP configuration.

## Check your current work

Run these commands in PowerShell:

```powershell
git -C D:\projects\epapers\EpapersApi status --short --branch
git -C D:\projects\epapers\userFrontend status --short --branch
git -C D:\projects\epapers\EpapersApi log -5 --oneline
git -C D:\projects\epapers\userFrontend log -5 --oneline
```

Keep both repositories on compatible versions while integrating endpoints. During this integration, switching the backend to earlier branches temporarily removed routes and brought back Turnstile requirements, causing startup and connection failures.

## Create a feature branch

Stop the API, frontend and email worker with Ctrl+C in their terminals. Save your changes before switching. After checking that the backend handover branch is the base you want:

```powershell
cd D:\projects\epapers\EpapersApi
git switch backend/phase-8-handover
git switch -c feature/frontend-api-integration

cd D:\projects\epapers\userFrontend
git switch -c feature/frontend-api-integration
```

The same feature name in both repositories makes related work easier to find. Run these commands when you are ready; this guide does not execute them.

## Save changes before switching

Review your diff and stage the intended files by name, then commit:

```powershell
git status --short
git diff
git add src/services/api.ts src/services/client.ts
git commit -m "Connect frontend services to backend API"
```

For unfinished work, stash tracked and untracked files:

```powershell
git stash push -u -m "Frontend API work in progress"
git switch main
git stash list
```

To resume, switch back to the original feature branch, then apply the stash. Applying preserves the stash until you have checked the result:

```powershell
git switch feature/frontend-api-integration
git stash apply
git status --short
```

`.env`, `.env.local`, node_modules and generated output are ignored; a normal stash or commit does not include them. Keep secrets out of commits. Local environment files stay in the same directory when you switch branches, so an older branch can become incompatible with the current configuration.

## Restart after switching

Read the branch's setup instructions. If the lockfile changed, run `npm.cmd ci`. For backend schema changes, run `npm.cmd run db:generate`. Check migration requirements separately: switching Git branches does not undo changes already applied to a database. Do not point experimental migration or database tests at your main database.

Restart the backend on port 3001 and frontend on port 3000. The backend `APP_ORIGIN` must match the exact browser origin, including scheme and port. Check the connection:

```powershell
cd D:\projects\epapers\EpapersApi
npm.cmd run db:verify

cd D:\projects\epapers\userFrontend
npm.cmd run test:connection
```

If Windows reports that no credentials are available in its TLS security package, run the commands in your normal terminal outside the restricted agent sandbox. This error is distinct from a database password failure.

## Compare and merge

Fetch remote branch information without changing your working files:

```powershell
git fetch origin
git branch -a
git diff main...feature/frontend-api-integration
```

`main` above is an example comparison target; use the actual intended base branch in each repository. Prefer a pull request when collaborating. Before merging, run the frontend tests/build and backend tests/type checking, and confirm that the backend base includes all required phases. Resolve conflicts by understanding both changes, then rerun checks.

## Use worktrees to compare versions

A worktree gives another branch its own folder, allowing you to keep the active checkout stable:

```powershell
cd D:\projects\epapers\EpapersApi
git worktree add D:\projects\epapers\EpapersApi-review -b review/api-check backend/phase-8-handover
git worktree list
```

Install dependencies in that folder and supply its local `.env` privately. Use different ports and a separate disposable database where mutations or migrations are involved. Configure that instance's API origin and frontend origin to match. A separate folder also prevents two Next servers from sharing the same generated build files.

Never use a forced checkout, hard reset or forced clean merely to get past a branch-switch error. First save your work and identify the conflicting files.
