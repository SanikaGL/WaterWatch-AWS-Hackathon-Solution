# WaterWatch — Phased Plan, Testing Workflow & 3-Day Scope

## Testing workflow (Kiro must follow this loop per feature)
```
1. Write feature
2. Write/update tests
3. Run unit tests (npm test)
4. sam build
5. sam local start-api
6. Test API locally
7. Fix problems
8. Deploy to DEV AWS (sam deploy)
9. Integration test
10. Commit to Git
```
Three levels:
- L1 Unit: business logic (report validation, reward eligibility, recurring threshold, flood status). No AWS needed.
- L2 Local API: `sam build` + `sam local start-api`, point React at localhost.
- L3 AWS integration: `sam deploy` to `waterwatch-dev`, test real API Gateway -> Lambda -> DynamoDB/S3.

Do NOT deploy to AWS on every edit. Iterate at L1/L2.

## 3-day scope decision (what wins the demo)
MUST build:
- Region context (State>District>Taluk, stable IDs)
- Anonymous reporting (pollution/leakage/hazard) + S3 presigned upload + location
- Floods (global + region) + citizen live updates
- Region home (filtered counts/lists) + water-body detail + comments
- Recurring-issue detection (configurable) + Bedrock awareness post + simulated publish  <- SIGNATURE
- Minimal authority status loop
- Mobile-first polished UI + demo data

AUTH MATRIX (all REAL Cognito — not mocked):
- Citizen   -> anonymous reporting, NO account
- Volunteer -> real Cognito signup -> email verification -> login (group: volunteer)
- Cleaner   -> real Cognito signup -> email verification -> login (group: cleaner)
- Authority -> controlled/pre-created account (seeded/admin-assigned) -> login (group: authority)

SIMULATE (only these):
- Social posting: Instagram is REAL via Graph API; falls back to simulated if creds absent.
  Twitter/LinkedIn optional/simulated.
- Full cleanup/reward UI may be trimmed for time, but reward logic is unit-tested and the
  cleaner auth + evidence upload path is real.

## Phases (build in order, finish+verify before moving on)
- Phase 1 Foundation: repo, React/Vite/TS, SAM, API Gateway, Lambda, DynamoDB, S3, CloudWatch, CI/test. Prove Frontend->API Gateway->Lambda->DynamoDB with one test report.
- Phase 2 Reporting: pollution/leakage/hazard, anonymous, image upload, location, status.
- Phase 3 Regions + water bodies: region selector + context, district/region pages, water-body detail, comments, filtering.
- Phase 4 Floods: global active layer, flood dashboard, incident page, citizen updates.
- Phase 5 Recurring + AI: Bedrock classification/summary, recurring detection, auto post generation, simulated publish.
- Phase 6 Authority: pre-created authority account, dashboard, status updates, verification.
- Phase 7 Polish: responsive mobile UI, animations, awareness videos, loading/empty/error states, demo data, 3-min demo rehearsal.
- Phase 8 Production Demo Deployment (checklist below).

## Phase 8 — Production Demo Deployment (checklist)
- Build React production bundle.
- Deploy frontend to S3; serve via CloudFront over HTTPS.
- Configure production API URL (no localhost anywhere).
- Deploy backend via SAM to `waterwatch-prod`.
- Verify API Gateway -> Lambda -> DynamoDB/S3.
- Verify Cognito signup + email verification + login for volunteer/cleaner; authority login.
- Verify CORS, S3 uploads, and all region filtering (state/district/taluk IDs).
- Confirm no localhost URLs remain in the built bundle.
- Test the ENTIRE app using only the public CloudFront URL.
- Record the final demo URL. Submit ONLY after successful end-to-end testing.

## Day mapping (3 days)
- Day 1: Phase 1 + Phase 2 + Cognito setup (auth is real, start early)
- Day 2: Phase 4 (floods) + Phase 3 (regions/water bodies/comments) + Phase 5 (recurring + AI)
- Day 3: Phase 6 (authority) + Phase 7 (polish, seed) + Phase 8 (deploy, verify, submit)

## Rule for Kiro
Do not build the whole app in one shot. Build a phase, test it (L1/L2), verify end-to-end, then continue. Keep product/architecture decisions aligned with requirements.md and design.md; raise a flag only when a decision conflicts with them.
