# WaterWatch — Deployment Guide (Phase 8)

Everything is code-complete and locally verified. Deployment needs AWS access on this
machine, which must be set up once. Then a single script deploys the whole stack.

## 0. One-time prerequisites
```powershell
# SAM CLI
winget install Amazon.SAM-CLI

# AWS credentials (use us-east-1 for best Bedrock availability)
aws configure
# -> Access key, Secret key, region=us-east-1, output=json

# (optional) Enable Bedrock model access for Claude Haiku in the AWS console
#   Bedrock > Model access > enable "anthropic.claude-3-haiku". If skipped, the app
#   uses a built-in deterministic fallback so awareness posts still generate.
```
This network intercepts TLS, so Node must trust the system cert store. The deploy
script sets `NODE_OPTIONS=--use-system-ca` automatically; if you run commands manually,
set it first: `$env:NODE_OPTIONS="--use-system-ca"`.

## 1. Deploy (one command)
```powershell
.\deploy.ps1            # dev stack  (waterwatch-dev)
.\deploy.ps1 -Config prod   # prod stack (waterwatch-prod)
```
The script: installs deps, runs unit tests, `sam build` + `sam deploy`, reads stack
outputs, writes `frontend/.env.production`, builds the SPA, syncs it to the site S3
bucket, and invalidates CloudFront. It prints the **public demo URL** at the end.

## 2. Create an authority account (not self-signup)
Authority is never self-assignable. After someone signs up (as volunteer/cleaner) OR
you create a user directly, add them to the `authority` group:
```powershell
# Replace POOL_ID and the email
aws cognito-idp admin-create-user --user-pool-id POOL_ID --username authority@example.com `
  --user-attributes Name=email,Value=authority@example.com Name=email_verified,Value=true `
  --temporary-password "Temp#1234"
aws cognito-idp admin-add-user-to-group --user-pool-id POOL_ID --username authority@example.com `
  --group-name authority
```
On first login Cognito will prompt to set a new password.

## 3. Monthly community alerts
Awareness alerts are generated and shown on the in-app **Alerts** page (no social-network
publishing). The `MonthlyAlertsFn` Lambda runs on an EventBridge schedule (1st of each month)
to produce the "most-polluted water body per region" alerts. Authorities can also trigger the
analysis on demand via `POST /alerts/run-monthly`.

## 4. Enable Bedrock (optional, for live AI copy)
Deploy with `BedrockEnabled=true` once model access is granted:
```powershell
sam deploy --parameter-overrides "Stage=dev BedrockEnabled=true"
```

## 5. Verification checklist (test on the PUBLIC URL only)
- [ ] Open the CloudFront URL; no localhost anywhere in network calls.
- [ ] Landing shows active floods + awareness; mobile hamburger works on a phone.
- [ ] Select region (Karnataka > Hassan > a taluk); counts load.
- [ ] Submit an anonymous report with a photo; image appears (served from media bucket).
- [ ] Water-body detail shows reports; add a comment.
- [ ] Sign up (volunteer/cleaner) -> receive email code -> verify -> sign in.
- [ ] Authority login -> dashboard totals + pending queue -> change a report status.
- [ ] Alerts page shows the AI awareness post; authority Publish works (real or simulated).
- [ ] Recurring issue appears after crossing the threshold.
- [ ] CORS OK (no console errors), region filtering by IDs correct.
- [ ] Record the final demo URL. Submit only after this checklist passes.

## Teardown (avoid lingering cost)
```powershell
sam delete --stack-name waterwatch-dev
```
Note: S3 buckets must be emptied before stack deletion if they contain objects.

## Cost note
Everything is pay-per-use and idles near $0: HTTP API, Lambda (arm64), DynamoDB
on-demand, S3, CloudFront, Cognito (free tier 50k MAU), EventBridge, SNS, SSM, CloudWatch.
