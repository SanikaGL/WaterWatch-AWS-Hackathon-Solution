# WaterWatch 💧

A serverless, citizen-first **water-safety platform**. Anyone can report water pollution, leakage, or flood hazards in seconds — **no login required** — while volunteers, cleaners, and government authorities coordinate the response, and AI turns recurring problems into public awareness alerts.

> Built for an AWS hackathon (water-safety track). Fully serverless, deployed via AWS SAM.

**Live demo:** https://d1rbci3mxxh0cg.cloudfront.net

---

## The problem

Water problems are hyper-local and under-reported. A citizen who spots sewage in a lake or a burst pipeline usually has nowhere quick to report it, repeat offences on the same water body never get connected, flood information is scattered, and the volunteers/cleaners who fix things aren't linked to the authorities who verify and reward their work.

WaterWatch closes those gaps: **frictionless anonymous reporting, regional aggregation, flood coordination, and a bridge between citizens, volunteers/cleaners, and authorities.**

## Who it's for

- **Citizens (anonymous):** report pollution/leakage/hazards with a photo + exact location; post live updates on active floods. No account needed.
- **Volunteers (account):** organize cleanup/awareness events, post updates, build a public profile.
- **Cleaners (account):** clean water bodies, submit before/after evidence, get verified (reward hook; payout deferred to government).
- **Authorities (admin-provisioned, sign-in only):** one per taluk; region-scoped dashboard, verify reports, **declare flood incidents**, message volunteers/cleaners.

## Core features

- No-signup anonymous reporting with media evidence.
- Region-centric model: **State → District → Taluk → Water body** (filter by stable IDs, display as "Taluk, District, State").
- Region pages aggregating local floods, water bodies, reports, events, and people.
- Authority-declared flood incidents + citizen live updates.
- Searchable Volunteer / Cleaner / Authority directories (search by name **or** region).
- 1:1 direct messaging (verified member ↔ their region's authority).
- **AI community alerts:** when a water body crosses a report threshold, and monthly for the most-polluted body per region, Amazon Bedrock generates an evidence-backed awareness post (with real photo proof) that never names or blames anyone.
- Mobile-first, responsive UI with clear section signposting.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript, Vite, React Router, `amazon-cognito-identity-js`, plain CSS design system |
| Backend | Node.js 22 (ARM64) AWS Lambda, TypeScript, esbuild, shared HTTP router (runs on Lambda **and** local Express), Vitest |
| Data | Amazon DynamoDB — single-table design + one GSI, on-demand |
| Auth | Amazon Cognito (User Pool + `volunteer`/`cleaner`/`authority` groups) |
| AI | Amazon Bedrock — Anthropic Claude 3 Haiku (with deterministic fallback) |
| IaC | AWS SAM (`template.yaml`) |

## AWS architecture

Everything is **serverless and pay-per-use** (idles near $0).

- **API Gateway (HTTP API)** — public API; Lambda reads the Cognito JWT from the Authorization header to identify users while keeping anonymous reporting open.
- **AWS Lambda** — API function, Cognito post-confirmation trigger (assigns the chosen role), and a monthly-alerts function.
- **DynamoDB** (single table + GSI1, on-demand) — all persistence (reports, floods, profiles, events, posts, alerts, messages).
- **Cognito** — real auth; email-OTP self-signup for volunteers/cleaners; authorities admin-provisioned only.
- **S3** — user media + static site hosting.
- **CloudFront** — global HTTPS delivery of the SPA (the demo URL).
- **Bedrock** — AI awareness-post generation.
- **EventBridge** — monthly pollution-analysis schedule.
- **SNS** — flood/authority alert fan-out.
- **SSM Parameter Store** — config/thresholds (never hard-coded).
- **CloudWatch** — logs/observability.

```
Browser (CloudFront SPA)
        │  HTTPS
        ▼
API Gateway (HTTP API) ──► Lambda (API) ──► DynamoDB (single table + GSI1)
                                   │
                                   ├─► Bedrock (awareness posts)
                                   └─► S3 (media)
Cognito (auth) ──► Lambda (post-confirm) assigns role group
EventBridge (monthly) ──► Lambda (monthly alerts) ──► DynamoDB
```

## Repository layout

```
backend/           # Lambda + domain logic (TypeScript)
  src/
    handlers/      # reports, floods, volunteers, authority, messages, media, social
    domain/        # types, recurring/alert logic, validation, config (+ unit tests)
    data/          # single-table repo, DynamoDB keys, region tree, in-memory DB
    http/          # shared router + request/response types
    local/         # local Express server, seeds, smoke tests, admin scripts
    lambda.ts      # API Gateway + EventBridge entry points
frontend/          # React + Vite SPA
  src/
    pages/         # Home, Regions, Report, Floods, Volunteers, Cleaners, Authorities, Alerts, Messages, ...
    components/    # Nav, cards, SearchBar, RegionSelect, MessageButton, ...
    context/       # Auth + Region context
    api/           # API client, Cognito, media/region helpers
template.yaml      # AWS SAM infrastructure
deploy.ps1         # one-shot deploy script
DEPLOY.md          # deployment guide
```

## Run locally (no AWS needed)

Requires Node.js 22.

```powershell
# Backend (in-memory DB, port 4000)
cd backend
npm install
npm run seed:mem         # seed demo data
npm run dev:mem          # start local API

# Frontend (port 5173)
cd ../frontend
npm install
npm run dev
```

The local server uses an in-memory, file-persisted DB and a dev-auth shim (header `x-dev-groups`) so every feature works without AWS.

> **Videos:** large demo `.mp4` files are git-ignored. The app falls back to SVG posters; drop your own clips into `frontend/public/videos/` (see that folder's README for names).

## Deploy to AWS

**Full beginner-friendly, step-by-step instructions are in [DEPLOY.md](DEPLOY.md)** —
it covers prerequisites, credentials, the TLS/esbuild gotchas, and every command.

The short version:

```bash
# 0. install: Node 22, AWS CLI, SAM CLI, and `npm i -g esbuild`
aws configure                 # set your keys + region (we used ap-south-1)

# 1. backend
sam build
sam deploy --guided           # first time; answer the prompts (Stage=dev, BedrockEnabled=true)

# 2. frontend — put the stack Outputs into frontend/.env.production, then:
cd frontend && npm install && npm run build && cd ..
aws s3 sync frontend/dist "s3://<SiteBucketName>" --delete
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
```

`sam deploy` prints an **Outputs** block — `SiteUrl` is your live public URL. Then
provision an authority login (admin only, since authorities don't self-signup):

```bash
cd backend
# env: AWS_REGION, USER_POOL_ID (from outputs), TABLE_NAME
npx tsx src/local/provisionAuthority.ts --email you@example.com --password "Pass@12345" \
  --name "Officer Name" --taluk BELUR --designation "Taluk Water Officer" --department "Minor Irrigation Dept."
```

## Testing

```powershell
cd backend
npm test                 # Vitest unit tests (recurring detection, reward, validation)
# smoke scripts in src/local/*Smoke.ts exercise end-to-end flows against the local server
```

## Design & ethics guardrails

- Scope is strictly **water-only**.
- Anonymous reporting needs no login; rewards require a **verified cleanup**, never a report.
- AI awareness posts **never accuse or name individuals** — only the problem, place, and evidence.
- Secrets/config live in SSM; thresholds and reward amounts are configurable, never hard-coded.
- Every data view has explicit loading / empty / error states.

## License

Prepared for a hackathon submission.
