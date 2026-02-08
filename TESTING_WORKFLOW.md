# Testing Workflow Guide

## Overview

Your test suite uses **Option 4: Optimized Multi-Tier Strategy**

- ⚡ **Fast PRs**: Unit tests only (~1 sec)
- 🛡️ **Protected Main**: Full tests on merge (~3 min)
- 📅 **Scheduled**: Comprehensive browser tests (configurable)

---

## Developer Workflow

### 1. Working on a Feature Branch

```bash
git checkout -b feature/my-feature
# Make changes...
git push origin feature/my-feature
```

**What runs in CI:**
- ✅ Unit tests (76 tests, ~1 second)
- ⏭️ E2E tests skipped (fast feedback)

---

### 2. Creating a Pull Request

```bash
gh pr create --title "Add feature"
```

**What runs in CI:**
- ✅ Unit tests (76 tests, ~1 second)
- ⏭️ E2E tests skipped (fast PR checks)

---

### 3. Merging to Main

```bash
gh pr merge --merge
# or merge via GitHub UI
```

**What runs in CI:**
- ✅ Unit tests (76 tests, ~1 second)
- ✅ E2E tests (20 tests, ~2-3 minutes)
- Chromium only for speed
- Protects main branch automatically

---

## Running Tests Locally

### Quick Unit Tests (During Development)

```bash
npm run test:unit        # Run once
npm run test:watch       # Watch mode (auto-rerun)
npm run test:ui          # Interactive UI
npm run test:coverage    # With coverage report
```

**When to use:** After every code change, before committing

---

### Full E2E Tests (Before Creating PR)

```bash
npm run test:e2e         # All desktop browsers (local)
npm run playwright:ui    # Interactive E2E UI
npm run playwright:debug # Debug failing tests
```

**When to use:**
- Before creating important PRs
- Testing UI changes
- Investigating CI failures
- Optional, not required for every commit

---

### All Tests

```bash
npm test  # Runs unit + integration + E2E
```

**When to use:** Before major releases or after significant changes

---

## Scheduled Test Control

### View Scheduled Tests

Go to: **GitHub → Actions → Workflows**
- `Full Browser Coverage Tests` (weekly)
- `Scheduled Regression Tests` (daily)

### Run Scheduled Tests Manually

1. Go to GitHub → Actions
2. Select workflow (e.g., "Full Browser Coverage Tests")
3. Click "Run workflow" button
4. Choose branch (usually `main`)
5. Click "Run workflow"

### Change Schedule

Edit `.github/workflows/full-browser-tests.yml`:

```yaml
schedule:
  - cron: '0 3 * * 0'  # Change this line
```

**Cron format:** `minute hour day month weekday` (UTC timezone)

**Examples:**
```yaml
'0 3 * * 0'   # Every Sunday at 3 AM UTC
'0 2 * * *'   # Every day at 2 AM UTC
'0 14 * * 1'  # Every Monday at 2 PM UTC
'0 0 1 * *'   # First day of month at midnight
'0 */6 * * *' # Every 6 hours
```

**To disable scheduled tests:**
```yaml
# schedule:
#   - cron: '0 3 * * 0'  # Commented out = disabled
```

---

## Uploading Local Test Results (Optional)

If you want to save local test results for reference:

### Option A: Manual Upload to GitHub

```bash
# Run tests locally
npm run test:e2e

# Results are in:
# - playwright-report/   (HTML report)
# - test-results/        (Screenshots, traces)

# Create a GitHub release or issue and attach files manually
```

### Option B: Keep Local Only

```bash
# View HTML report
npm run playwright:report

# Check screenshots
open test-results/

# No upload needed - results are local only
```

---

## CI/CD Cost Estimation

### Current Setup (Option 4)

| Event | Frequency | Tests Run | Time | Cost/Month |
|-------|-----------|-----------|------|------------|
| PR creation | ~10/month | Unit only | 1 sec | ~0 min |
| Merge to main | ~10/month | Unit + E2E | 3 min | ~30 min |
| Daily regression | 30/month | Unit + E2E | 3 min | ~90 min |
| Weekly full browser | 4/month | All browsers | 10 min | ~40 min |
| **Total** | | | | **~160 min/month** |

**GitHub Free Tier:** 2,000 minutes/month
**Usage:** ~8% of free tier ✅

---

## Troubleshooting

### PR tests pass, but main branch tests fail

This is expected! E2E tests only run on main branch.

**Solution:**
1. Run E2E tests locally: `npm run test:e2e`
2. Fix issues
3. Push fix to main

### I want to run E2E tests before merging

**Option 1:** Run locally
```bash
npm run test:e2e  # Test before pushing
```

**Option 2:** Manually trigger workflow
1. GitHub → Actions → "Test Against Main App"
2. "Run workflow" on your branch

**Option 3:** Temporarily edit workflow to run on PRs
(Not recommended - defeats the purpose of fast PRs)

### Scheduled tests aren't running

Check:
1. Workflow file has correct cron syntax
2. Workflow is not commented out
3. GitHub Actions are enabled for repo
4. Check Actions tab for any errors

---

## Best Practices

✅ **Do:**
- Run unit tests before every commit (`npm run test:unit`)
- Run E2E tests locally for UI changes (`npm run test:e2e`)
- Review CI failures before merging PRs
- Use manual workflow triggers for custom testing

❌ **Don't:**
- Don't skip unit test failures ("I'll fix it later")
- Don't merge PRs with failing unit tests
- Don't push directly to main (use PRs)
- Don't disable E2E tests on main branch

---

## Summary

**Fast Development:**
- Feature branches: Unit tests only (1 sec)
- Pull requests: Unit tests only (1 sec)

**Quality Assurance:**
- Main branch: Full tests (3 min)
- Scheduled: Comprehensive browser tests

**Manual Control:**
- Run E2E locally anytime
- Trigger scheduled tests from GitHub UI
- Customize schedules via cron expressions
