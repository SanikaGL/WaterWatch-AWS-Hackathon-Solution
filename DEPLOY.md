# WaterWatch — Deployment Guide (step-by-step, beginner-friendly)

This guide takes you from a fresh machine to a **live, public WaterWatch site on AWS**.
Everything is serverless and defined in one SAM template (`template.yaml`), so there's
no clicking around the AWS console to create resources.

If you've never deployed to AWS before, just follow the steps top to bottom.

---

## What gets created on AWS

| Service | Purpose |
|---|---|
| API Gateway (HTTP API) | Public REST endpoint for the app |
| Lambda ×3 | API, Cognito post-signup trigger, monthly AI-alerts job |
| DynamoDB | Single-table database (on-demand) |
| Cognito | Login / signup + user roles (volunteer, cleaner, authority) |
| S3 ×2 | Static website files + uploaded media |
| CloudFront | The public HTTPS URL (CDN) |
| Bedrock | AI awareness-post generation (Claude 3 Haiku) |
| EventBridge | Runs the monthly pollution analysis |
| SNS, SSM, CloudWatch | Alerts, config, logs |

Everything is pay-per-use and idles near **$0**.

---

## 0. Prerequisites (install once)

1. **An AWS account** with permission to create the above resources.
2. **Node.js 22+** — https://nodejs.org
3. **AWS CLI v2** — https://aws.amazon.com/cli/
   Verify: `aws --version`
4. **AWS SAM CLI** — https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
   Verify: `sam --version`
5. **esbuild on your PATH** (SAM uses it to bundle the Lambdas):
   ```bash
   npm install -g esbuild
   esbuild --version
   ```

> **Windows / corporate network note:** if `npm`, `aws`, or `sam` fail with TLS /
> "certificate verify failed" errors, your network intercepts HTTPS. Fix it by trusting
> your system certificate store:
> ```powershell
> # Export your Windows trusted roots to a PEM file
> $pem = "$env:USERPROFILE\.aws\ca-system.pem"
> Get-ChildItem Cert:\LocalMachine\Root | ForEach-Object {
>   "-----BEGIN CERTIFICATE-----"
>   [Convert]::ToBase64String($_.RawData,'InsertLineBreaks')
>   "-----END CERTIFICATE-----"
> } | Out-File -Encoding ascii $pem
> # Point the AWS CLI + SAM at it (persist for all future shells)
> [Environment]::SetEnvironmentVariable("AWS_CA_BUNDLE", $pem, "User")
> $env:AWS_CA_BUNDLE = $pem
> # And for npm/node:
> $env:NODE_OPTIONS = "--use-system-ca"
> ```

---

## 1. Configure AWS credentials (once)

```bash
aws configure
```
Enter your **Access Key ID**, **Secret Access Key**, a **region**, and `json` output.

- This project was deployed to **`ap-south-1`** (Mumbai). You can use any region, but
  make sure **Amazon Bedrock + Claude 3 Haiku** is available there (see step 4).

Verify it works:
```bash
aws sts get-caller-identity
```
You should see your account id and user ARN.

---

## 2. Build and deploy the backend (SAM)

From the project root:

```bash
sam build
```

Then deploy. The **first time**, use guided mode and accept the defaults:

```bash
sam deploy --guided
```
Answer the prompts like this:
- Stack Name: `waterwatch-dev`
- AWS Region: `ap-south-1` (or your region)
- Parameter `Stage`: `dev`
- Parameter `BedrockEnabled`: `true`
- Allow SAM to create IAM roles: **Y**
- Disable rollback: **N**
- Save arguments to samconfig.toml: **Y**

For every later deploy you can just run:
```bash
sam deploy
```

Or the exact non-interactive command we used:
```bash
sam deploy --stack-name waterwatch-dev --region ap-south-1 --resolve-s3 \
  --capabilities CAPABILITY_IAM --no-confirm-changeset \
  --parameter-overrides "Stage=dev BedrockEnabled=true"
```

When it finishes, SAM prints **Outputs**. Note these — you'll need them next:
- `ApiUrl` – the backend API base URL
- `UserPoolId`, `UserPoolClientId` – Cognito
- `MediaPublicBase` – public media URL
- `SiteBucketName` – S3 bucket for the website
- `DistributionId` – CloudFront id
- `SiteUrl` – **your public demo URL** 🎉

You can re-print them any time:
```bash
aws cloudformation describe-stacks --stack-name waterwatch-dev \
  --region ap-south-1 --query "Stacks[0].Outputs"
```

---

## 3. Build and upload the frontend

1. Create `frontend/.env.production` using your stack outputs (this file is git-ignored):
   ```
   VITE_API_URL=<ApiUrl>
   VITE_MEDIA_BASE=<MediaPublicBase>
   VITE_COGNITO_USER_POOL_ID=<UserPoolId>
   VITE_COGNITO_CLIENT_ID=<UserPoolClientId>
   ```
2. Build it:
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```
3. Upload to the website bucket and refresh the CDN (replace with your names/id):
   ```bash
   aws s3 sync frontend/dist "s3://<SiteBucketName>" --delete --region ap-south-1
   aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
   ```

Open the **`SiteUrl`** — WaterWatch is live.

> **Note on demo videos:** large `.mp4` background videos are *not* in this repo
> (git-ignored, hundreds of MB). The app falls back to SVG posters automatically. To
> use real videos, drop your own clips into `frontend/public/videos/` (see that folder's
> `README.md` for the expected filenames) before building.

---

## 4. (Optional) Turn on real AI copy — enable Bedrock

The app works without this (it uses a built-in fallback writer), but for real
LLM-generated awareness posts:

1. AWS Console → **Bedrock → Model access** → enable **Anthropic Claude 3 Haiku** in your region.
2. Make sure you deployed with `BedrockEnabled=true` (step 2 did this).

---

## 5. Seed demo data (optional, makes the site non-empty)

To populate regions, a sample flood, reports, volunteers, cleaners, authorities, and
AI alerts in the live table:

```bash
cd backend
# point the seed at your deployed table + region
# (PowerShell)
$env:TABLE_NAME="waterwatch-dev"; $env:AWS_REGION="ap-south-1"; $env:USE_MEMORY_DB="false"
npx tsx src/local/seed.ts
```

---

## 6. Create an authority login (admin step — authorities never self-signup)

Authorities are provisioned by an admin. A helper script creates the Cognito user,
puts them in the `authority` group, and binds them to a region:

```bash
cd backend
# PowerShell:
$env:AWS_REGION="ap-south-1"
$env:USER_POOL_ID="<UserPoolId from outputs>"
$env:TABLE_NAME="waterwatch-dev"
npx tsx src/local/provisionAuthority.ts `
  --email belur.authority@example.com --password "Belur@12345" `
  --name "Suresh Hegde" --taluk BELUR `
  --designation "Taluk Water Officer" --department "Minor Irrigation Dept."
```
It prints the **email + password + region**. Sign in on the site → Account → Sign in.

Volunteers and cleaners simply **sign up on the site** (email OTP) — no admin step.

---

## 7. Quick verification

- [ ] Open the CloudFront `SiteUrl`.
- [ ] Submit an anonymous report with a photo (no login) → it appears.
- [ ] Pick a region (Karnataka → Hassan → a taluk) → local data loads.
- [ ] Sign up as a volunteer/cleaner (email OTP) → set up profile → it shows in the list.
- [ ] Sign in as the authority → dashboard loads → declare a flood incident.
- [ ] Message between a volunteer/cleaner and the authority works both ways.
- [ ] Alerts page shows AI awareness posts with photo evidence.

---

## Teardown (to avoid any lingering cost)

```bash
# empty the S3 buckets first (CloudFormation won't delete non-empty buckets)
aws s3 rm "s3://<SiteBucketName>" --recursive
aws s3 rm "s3://<MediaBucketName>" --recursive
sam delete --stack-name waterwatch-dev --region ap-south-1
```

---

## Troubleshooting (issues we actually hit)

| Symptom | Fix |
|---|---|
| `Esbuild Failed: Cannot find esbuild` | `npm install -g esbuild` (must be on PATH) |
| `certificate verify failed` (aws/sam/npm) | Set `AWS_CA_BUNDLE` + `NODE_OPTIONS=--use-system-ca` (see prereqs note) |
| `Circular dependency between resources` | Already fixed in `template.yaml` (PostConfirm policy uses a wildcard ARN) |
| Lambda 500: `Dynamic require of "node:https"` | Already fixed — Lambdas bundle as CommonJS (`.cjs`) |
| API returns `No route for GET /dev/...` | Already fixed — the Lambda strips the stage prefix |
| Large `git push` rejected | Videos are git-ignored on purpose; don't force-add `.mp4` files |
