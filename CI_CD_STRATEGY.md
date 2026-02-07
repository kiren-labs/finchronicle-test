# CI/CD Strategy for Multi-Repository Testing

## 📋 Overview

FinChronicle uses a **dual-repository architecture**:
- **Main Repo:** `finance-tracker` (the PWA app)
- **Test Repo:** `finance-tracker-tests` (the test suite)

This document outlines the CI/CD strategy for automated testing across both repositories.

---

## 🎯 Strategy: Cross-Repository Testing

### Why This Approach?

✅ **Separation of Concerns** - App code stays dependency-free
✅ **Independent Evolution** - Tests can be updated without touching app
✅ **Flexible Testing** - Test any version of the app
✅ **Historical Tracking** - Version metadata tracks what was tested

---

## 🔄 Testing Workflows

### 1. Main App PR/Push → Test Repo Tests

**File:** `finance-tracker/.github/workflows/test-with-test-repo.yml`

**Triggers:**
- Pull requests to `main`
- Pushes to `main`, `dev/**`, `feature/**`

**What it does:**
1. Checks out main app code (PR branch)
2. Checks out test repository
3. Extracts functions from app.js
4. Verifies version and extraction success
5. Runs unit tests (76 tests)
6. Runs E2E tests (Playwright)
7. Uploads test results as artifacts
8. Generates summary with version info

**Result:** PR cannot merge unless all tests pass ✅

---

### 2. Test Repo Changes → Test Against Main App

**File:** `finance-tracker-tests/.github/workflows/test-against-main.yml`

**Triggers:**
- Pull requests to test repo `main`
- Pushes to test repo `main`
- Manual trigger with custom app branch

**What it does:**
1. Checks out test repo (PR branch)
2. Checks out main app (configurable branch)
3. Extracts functions and verifies version
4. Runs all tests
5. Comments on PR with results
6. Uploads artifacts

**Use cases:**
- Verify test updates work against current app
- Test against specific app branch/version
- Validate new test additions

---

### 3. Scheduled Regression Tests

**File:** `finance-tracker-tests/.github/workflows/scheduled-tests.yml`

**Triggers:**
- Daily at 2 AM UTC (cron schedule)
- Manual trigger

**What it does:**
1. Tests latest app version daily
2. Creates GitHub issue if tests fail
3. Ensures app changes don't break tests

**Benefits:**
- Catches regressions early
- Validates production stability
- Automated issue creation for failures

---

## 📊 Version Tracking

### Automatic Version Detection

Every test run automatically:
1. Extracts `APP_VERSION` from `finance-tracker/app.js`
2. Creates `test-metadata.json`:
   ```json
   {
     "appVersion": "3.7.1",
     "testedAt": "2026-02-07T10:04:14.531Z",
     "extractedFunctions": 15,
     "totalFunctions": 15,
     "success": true
   }
   ```
3. Includes version in:
   - GitHub Actions summary
   - Test artifacts
   - PR comments

### Benefits

✅ **Traceability** - Know exactly what was tested
✅ **Historical Record** - Git history shows all tested versions
✅ **Version Mismatch Detection** - Fails if extraction incomplete
✅ **Audit Trail** - Compliance and debugging

---

## 🚀 Workflow Execution Examples

### Example 1: Developer Creates PR in Main Repo

```
Developer: Creates PR #123 with new feature
GitHub Actions:
  ↓
  1. Checkout PR branch
  2. Checkout test repo
  3. Extract functions → v3.7.1
  4. Run 76 unit tests → ✅ Pass
  5. Run E2E tests → ✅ Pass
  6. Comment on PR: "All tests pass for v3.7.1"
  ↓
Developer: Sees green checkmark, can merge
```

### Example 2: Tester Updates Test Suite

```
Tester: Adds new test in test repo PR #5
GitHub Actions:
  ↓
  1. Checkout test PR branch
  2. Checkout main app (main branch)
  3. Extract functions → v3.7.1
  4. Run updated tests → ✅ Pass
  5. Comment: "Tests verified against app v3.7.1"
  ↓
Tester: Merge test updates
```

### Example 3: Manual Test Against Feature Branch

```
Developer: Working on v3.8.0 feature branch
GitHub Actions (Manual):
  ↓
  Input: app_branch = "feature/new-ui"
  ↓
  1. Checkout test repo
  2. Checkout app feature branch
  3. Extract functions → v3.8.0-beta
  4. Run tests → ⚠️ 2 tests fail (expected)
  5. Upload results
  ↓
Developer: Fixes issues, re-runs tests
```

---

## 🔧 Configuration

### Required Secrets

None! Both repos are public, so GitHub Actions can clone them freely.

### Optional: Private Repository Setup

If either repo is private, add a Personal Access Token (PAT):

1. Generate PAT: GitHub Settings → Developer settings → Personal access tokens
2. Add to repo secrets: Settings → Secrets → Actions → `TEST_REPO_TOKEN`
3. Update workflow:
   ```yaml
   - name: Checkout test repository
     uses: actions/checkout@v4
     with:
       repository: kiren-labs/finance-tracker-tests
       token: ${{ secrets.TEST_REPO_TOKEN }}
       path: finance-tracker-tests
   ```

---

## 📈 Branch Protection Rules

### Main App Repository (`finance-tracker`)

**Recommended rules for `main` branch:**
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Required status checks:
  - `Validate` (existing CI)
  - `Run Unit & E2E Tests` (new test workflow)
- ✅ Require pull request reviews (1 approver)

### Test Repository (`finance-tracker-tests`)

**Recommended rules for `main` branch:**
- ✅ Require status checks to pass before merging
- ✅ Required status checks:
  - `Run Tests` (test-against-main workflow)
- ✅ Allow force pushes (for test fixes)

---

## 🎨 Alternative Strategies (Not Recommended)

### Option A: Git Submodules ❌
**Pros:** Single repo view
**Cons:** Complex management, merge conflicts, submodule hell

### Option B: Monorepo ❌
**Pros:** Everything together
**Cons:** Violates "no dependencies" philosophy, larger repo

### Option C: Repository Dispatch API ❌
**Pros:** True async communication
**Cons:** Complex setup, needs webhooks, harder to debug

### Option D: GitHub Apps ❌
**Pros:** Advanced features
**Cons:** Overkill, requires server, maintenance overhead

---

## 🐛 Troubleshooting

### Tests Fail to Extract Functions

**Symptom:** `extractedFunctions: 0/15`

**Solution:**
```bash
# Check if app.js exists
ls -la finance-tracker/app.js

# Verify function signatures
grep "function " finance-tracker/app.js
```

### Version Mismatch

**Symptom:** Expected v3.7.1, got v3.7.0

**Solution:**
1. Check `finance-tracker/app.js` line 2: `const APP_VERSION = '3.7.1'`
2. Verify `sw.js` and `manifest.json` match
3. Re-run extraction: `npm run extract`

### E2E Tests Timeout

**Symptom:** Playwright tests hang

**Solution:**
```yaml
# Increase timeout in workflow
- name: Run E2E tests
  run: npm run test:e2e
  timeout-minutes: 15  # Add this
```

### Permission Denied

**Symptom:** Cannot checkout test repo

**Solution:**
- For public repos: No action needed
- For private repos: Add PAT token (see Configuration above)

---

## 📚 Resources

### Workflows Location
- Main app: `finance-tracker/.github/workflows/`
- Test repo: `finance-tracker-tests/.github/workflows/`

### Documentation
- [GitHub Actions: Checking out repositories](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsuses)
- [Multi-repo CI/CD patterns](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)

### Related Files
- `finance-tracker-tests/TEST_REPORT.md` - Test coverage documentation
- `finance-tracker-tests/test-metadata.json` - Version tracking
- `finance-tracker/CLAUDE.md` - Project documentation

---

## ✅ Summary

| Scenario | Workflow | Result |
|----------|----------|--------|
| PR to main app | test-with-test-repo.yml | Tests must pass to merge |
| Push to main app | test-with-test-repo.yml | Validates production |
| PR to test repo | test-against-main.yml | Verifies test changes |
| Daily check | scheduled-tests.yml | Regression detection |
| Manual testing | test-against-main.yml | Test any branch |

**All workflows include:**
- ✅ Automatic version detection
- ✅ Metadata generation
- ✅ Artifact uploads
- ✅ PR comments
- ✅ Test summaries

---

**Last Updated:** 2026-02-07
**Strategy Version:** 1.0
**Maintained By:** Kiren Labs
