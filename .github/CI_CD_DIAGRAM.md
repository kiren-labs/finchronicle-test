# CI/CD Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FINCHRONICLE CI/CD STRATEGY                      │
│                     (Multi-Repository Testing)                       │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────┐        ┌────────────────────────────────┐
│   finance-tracker (Main App)   │        │  finance-tracker-tests (Tests) │
│  github.com/kiren-labs/        │        │   github.com/kiren-labs/       │
│      finance-tracker           │        │    finance-tracker-tests       │
└────────────────────────────────┘        └────────────────────────────────┘
         │                                            │
         │ 1. Developer creates PR                   │
         │    or pushes to main                       │
         ▼                                            │
┌────────────────────────────────┐                   │
│  🔄 Workflow:                  │                   │
│  test-with-test-repo.yml       │                   │
│                                 │                   │
│  Steps:                         │                   │
│  1. Checkout main app (PR)      │◄──────────────────┤
│  2. Checkout test repo  ────────┼───────────────────┘
│  3. Extract functions            │
│  4. Run unit tests (201)         │
│  5. Run E2E tests                │
│  6. Upload artifacts             │
│  7. Comment on PR                │
└────────────────────────────────┘
         │
         ▼
    ✅ Tests Pass
         │
         ▼
   🎉 PR Can Merge


┌────────────────────────────────┐
│   finance-tracker-tests        │
│   (Test Repo)                   │
└────────────────────────────────┘
         │
         │ 2. Tester updates tests
         │    or creates PR
         ▼
┌────────────────────────────────┐        ┌────────────────────────────────┐
│  🔄 Workflow:                  │        │   finance-tracker (Main App)   │
│  test-against-main.yml         │        │                                 │
│                                 │        │                                 │
│  Steps:                         │        │                                 │
│  1. Checkout test repo (PR)     │        │                                 │
│  2. Checkout main app  ─────────┼────────┤ Clone from main branch        │
│  3. Extract functions            │        └────────────────────────────────┘
│  4. Run all tests                │
│  5. Comment on PR                │
│  6. Upload artifacts             │
└────────────────────────────────┘
         │
         ▼
    ✅ Tests Pass
         │
         ▼
   🎉 Test PR Can Merge


┌────────────────────────────────┐
│   Scheduled Tests (Daily)       │
│   Cron: 0 2 * * * (2 AM UTC)   │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐        ┌────────────────────────────────┐
│  🔄 Workflow:                  │        │   finance-tracker (Main App)   │
│  scheduled-tests.yml           │        │                                 │
│                                 │        │                                 │
│  Steps:                         │        │                                 │
│  1. Checkout test repo          │        │                                 │
│  2. Checkout main app  ─────────┼────────┤ Latest main branch            │
│  3. Run all tests                │        └────────────────────────────────┘
│  4. Create issue if fail         │
└────────────────────────────────┘
         │
         ▼
    ❌ Tests Fail?
         │
         ▼
    🐛 Auto-create GitHub Issue


══════════════════════════════════════════════════════════════════════

                        VERSION TRACKING FLOW

══════════════════════════════════════════════════════════════════════

finance-tracker/js/*.js (Modular ES6)
   │
   │ APP_VERSION = '3.10.4'
   │ 5 modules: utils, currency, validation, ui, settings
   ▼

┌──────────────────────────────────────────┐
│  Extraction Script                        │
│  (scripts/extract-functions.js)           │
│                                            │
│  1. Read modular JS files                  │
│  2. Extract APP_VERSION                    │
│  3. Extract 19 functions from 5 modules    │
│  4. Generate test-metadata.json            │
└──────────────────────────────────────────┘
   │
   ▼

test-metadata.json
{
  "appVersion": "3.10.4",
  "testedAt": "2026-03-09T...",
  "extractedFunctions": 19,
  "totalFunctions": 19,
  "success": true
}
   │
   ├──► GitHub Actions Summary
   ├──► PR Comments
   ├──► Test Artifacts
   └──► Git History


══════════════════════════════════════════════════════════════════════

                        TEST EXECUTION FLOW

══════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Actions                           │
│                                                                   │
│  1. Clone Repositories                                            │
│     ├── finance-tracker (app code)                               │
│     └── finance-tracker-tests (test code)                        │
│                                                                   │
│  2. Setup Environment                                             │
│     ├── Install Node.js 18                                       │
│     ├── npm ci (install test dependencies)                       │
│     └── Install Playwright browsers                              │
│                                                                   │
│  3. Extract & Verify                                              │
│     ├── npm run extract                                          │
│     ├── Read test-metadata.json                                  │
│     ├── Verify APP_VERSION                                       │
│     └── Check 19/19 functions extracted ✅                       │
│                                                                   │
│  4. Run Tests                                                     │
│     ├── npm run test:unit (201 tests)                           │
│     │   ├── Formatters (25 tests)                                │
│     │   ├── Parsers (26 tests)                                   │
│     │   ├── Validators (30 tests)                                │
│     │   ├── Transaction validation (62 tests)                    │
│     │   ├── Trend calculations (27 tests)                        │
│     │   └── Backup & settings (31 tests)                         │
│     │                                                             │
│     └── npm run test:e2e (Playwright)                           │
│         ├── Transaction CRUD                                     │
│         ├── CSV import/export                                    │
│         └── Filters & navigation                                 │
│                                                                   │
│  5. Generate Artifacts                                            │
│     ├── test-results/ (JUnit XML)                                │
│     ├── playwright-report/ (HTML)                                │
│     ├── test-metadata.json                                       │
│     └── screenshots/ (on failure)                                │
│                                                                   │
│  6. Report Results                                                │
│     ├── GitHub Actions Summary                                   │
│     ├── PR Comment (with version)                                │
│     └── Upload artifacts (30 day retention)                      │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  ✅ All Pass   │  → Can Merge PR
                    └────────────────┘
                             │
                    ┌────────────────┐
                    │  ❌ Some Fail  │  → Block Merge
                    └────────────────┘


══════════════════════════════════════════════════════════════════════

                    MANUAL WORKFLOW DISPATCH

══════════════════════════════════════════════════════════════════════

Developer → GitHub UI → Actions Tab → "Test Against Main App"
                │
                ▼
        ┌──────────────────────┐
        │  Input Parameters:    │
        │                       │
        │  app_branch: ______   │  (e.g., "feature/new-ui")
        │  app_version: ______  │  (e.g., "3.8.0-beta")
        └──────────────────────┘
                │
                ▼
        Run tests against
        specified branch/version
                │
                ▼
        View results in Actions tab


══════════════════════════════════════════════════════════════════════

                        KEY BENEFITS

══════════════════════════════════════════════════════════════════════

✅ Automatic version detection from app code
✅ Tests run on every PR (prevents breaking changes)
✅ Historical test results with version tracking
✅ Can test any branch against any version
✅ Daily regression testing (scheduled)
✅ PR comments show what version was tested
✅ Artifacts retained for 30 days
✅ Auto-create issues on scheduled test failures
✅ No manual coordination needed between repos
```
