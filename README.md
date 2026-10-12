# WaterWatch 💧

A **serverless, citizen-first water-safety platform**. Anyone can report water pollution, leakage, or flood hazards in seconds — **no login required** — while volunteers, cleaners, and government authorities coordinate the response, and AI turns recurring problems into public awareness alerts.

> Built for an AWS hackathon (water-safety track). 100% serverless, deployed with AWS SAM.

**🔗 Live demo:** https://d1rbci3mxxh0cg.cloudfront.net

---

## Table of contents
- [The problem](#the-problem)
- [The solution](#the-solution)
- [Who uses it](#who-uses-it-four-personas)
- [The region model](#the-region-model-the-backbone)
- [Features](#features)
- [How the AI works](#how-the-ai-works)
- [Tech stack](#tech-stack)
- [AWS architecture](#aws-architecture)
- [Request flow](#request-flow-example)
- [Repository layout](#repository-layout)
- [Run locally](#run-locally-no-aws-needed)
- [Deploy to AWS](#deploy-to-aws)
- [Testing](#testing)
- [Key engineering decisions](#key-engineering-decisions)
- [Ethics & guardrails](#ethics--guardrails)

---

## The problem

Water problems are **hyper-local and badly under-reported**:

- A citizen who spots sewage in a lake or a burst pipeline usually has **nowhere quick to report it**. Apps that exist demand sign-ups, which kills the moment.
- The **same water body** gets polluted again and again, but nobody connects the dots across many individual reports.
- During **floods**, information is scattered across WhatsApp and word-of-mouth — there's no single place to see what's happening and who's responding.
- The **volunteers and cleaners** who actually fix things aren't connected to the **authorities** who can verify and reward their work.

## The solution

WaterWatch closes those gaps with four tightly-connected ideas:

1. **Frictionless anonymous reporting** — report a water problem with a photo and exact location in seconds, no account.
2. **Regional aggregation** — everything is organized by region, so repeat problems surface and AI can flag them.
3. **Flood coordination** — authorities declare incidents; citizens post live updates; volunteers organize response events.
4. **A people bridge** — citizens → volunteers/cleaners → authorities, connected by region and direct messaging.

## Who uses it (four personas)

| Persona | Access | What they do |
|---|---|---|
| **Citizen** | Anonymous, no login | Report pollution/leakage/hazards with media; post live flood updates |
| **Volunteer** | Self-signup (email OTP) | Organize cleanup/awareness events, post updates, public profile |
| **Cleaner** | Self-signup (email OTP) | Physically clean water bodies, submit before/after evidence, get verified |
| **Authority** | Admin-provisioned, sign-in only | One per taluk: region dashboard, verify reports, **declare floods**, message members |

Rewards require a **verified cleanup action** (never just a report). Reward payout is intentionally left as a government concern — only the hook exists.

## The region model (the backbone)

Everything is organized by a strict hierarchy:

```
State → District → Taluk (the operational region) → Water body
```

- **Display identity** is always `"Taluk, District, State"` (e.g. *Belur, Hassan, Karnataka*).
- **Filtering/storage uses stable IDs** (`stateId`, `districtId`, `talukId`, `waterBodyId`) — never display names — so renames never break data.
- The deployed demo covers **Karnataka → Hassan → 8 taluks**. The design scales to all-India by swapping in a larger region dataset.

## Features

- 📝 **No-signup anonymous reporting** with photo/video, type (pollution/leakage/hazard), exact location, and region.
- 🗺️ **Region pages** aggregating local floods, water bodies, recent reports, events, and native people (all clickable).
- 🚨 **Authority-declared flood incidents** (region auto-scoped, photo + severity + description) + **citizen live updates**.
- 📣🧹 **Volunteer & Cleaner directories** — searchable by **name OR region**, with profiles (avatar, bio, Instagram/YouTube/extra links), posts, and inline comments.
- 🏛️ **Authority directory + region-scoped dashboard** with report verification.
- 💬 **1:1 direct messaging** between a verified member and their region's authority (clear sender/receiver chat UI).
- 🤖 **AI community alerts** — when a water body crosses a report threshold, and monthly for the most-polluted body per region, Bedrock writes an evidence-backed awareness post (with the real photo proof) that **never names or blames anyone**.
- 📱 **Mobile-first, responsive UI** with section signposting so content lower on a page isn't missed, and a prominent "report — no signup" call to action.
- ✅ Every data view has explicit **loading / empty / error** states.

## How the AI works

- **Model:** Amazon Bedrock running **Anthropic Claude 3 Haiku** (low cost, fast; available in `ap-south-1`).
- **Detection is deterministic (pure functions, unit-tested):** "recurring issue" = N reports for a water body within a time window (both configurable); "monthly" = highest-pollution water body per region.
- **Generation:** when a threshold is crossed, Bedrock writes a short, factual awareness post. The prompt forbids naming/accusing any individual or group; a sanitize step strips accusatory wording as a safety net.
- **Graceful fallback:** if Bedrock access isn't granted or the call fails, a deterministic template writes the post — so the feature never hard-fails in a demo.
- **Scheduling:** EventBridge runs the monthly analysis on the 1st of each month; authorities can also trigger it on demand.
- **Design note:** live Instagram auto-posting was intentionally **dropped** (Meta app review is slow/risky for a 3-day window). Instead the AI alerts live on an in-app Alerts page with the real proof media — fully working and demo-proof.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript, Vite, React Router, `amazon-cognito-identity-js`, hand-written CSS design system |
| Backend | Node.js 22 (ARM64) AWS Lambda, TypeScript, esbuild, one shared HTTP router (runs on Lambda **and** local Express), Vitest |
| Data | Amazon DynamoDB — single-table design + one GSI, on-demand billing |
| Auth | Amazon Cognito (User Pool + `volunteer` / `cleaner` / `authority` groups) |
| AI | Amazon Bedrock — Claude 3 Haiku (deterministic fallback) |
| Infra as code | AWS SAM (`template.yaml`) |

## AWS architecture

Everything is **serverless and pay-per-use** (idles near $0) — ideal for spiky, unpredictable civic traffic.

| Service | Role |
|---|---|
| **API Gateway (HTTP API)** | Public API front door. Routes are public; the Lambda reads the Cognito JWT from the `Authorization` header to identify logged-in users while keeping anonymous reporting open. |
| **AWS Lambda ×3** | Main API; Cognito post-confirmation trigger (assigns the chosen role group); monthly-alerts function. ARM64 for price/performance. |
| **DynamoDB** | Single table + one GSI (GSI1), on-demand. All entities (reports, floods, profiles, events, posts, alerts, messages) share the table via composed `PK`/`SK` keys. |
| **Cognito** | Real auth. Email-OTP self-signup for volunteers/cleaners; authorities are admin-provisioned only. |
| **S3 ×2** | User-uploaded media + static site hosting. |
| **CloudFront** | Global HTTPS delivery of the SPA (the public demo URL). |
| **Bedrock** | AI awareness-post generation. |
| **EventBridge** | Monthly pollution-analysis schedule. |
| **SNS** | Flood/authority alert fan-out. |
| **SSM Parameter Store** | Config/thresholds (never hard-coded; secrets never in source). |
| **CloudWatch** | Logs / observability. |

```
Browser (CloudFront-served SPA)
        │  HTTPS
        ▼
API Gateway (HTTP API) ──► Lambda (API) ──► DynamoDB (single table + GSI1)
                                   │
                                   ├─► Bedrock  (AI awareness posts)
                                   └─► S3       (media)
Cognito (auth) ──► Lambda (post-confirm) ──► assigns volunteer/cleaner/authority group
EventBridge (monthly cron) ──► Lambda (monthly alerts) ──► DynamoDB
```

## Request flow (example)

A citizen reports pollution:
1. Browser (CloudFront SPA) → `POST /reports` on API Gateway (no auth needed).
2. API Lambda validates input → writes the report to DynamoDB.
3. Lambda runs recurring-issue detection; if the water body crossed the threshold, it calls Bedrock to generate an awareness alert and stores it with the proof media collected from the source reports.
4. Later, EventBridge triggers the monthly analysis Lambda → finds the worst-polluted water body per region → generates monthly alerts.
5. Anyone opens the Alerts page → `GET /posts` → sees the AI post with real photo evidence.

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
    pages/         # Home, Regions, Report, Floods, Volunteers, Cleaners, Authorities,
                   # Alerts, Messages, HowItWorks, ...
    components/    # Nav, cards, SearchBar, RegionSelect, MessageButton, SectionNav, ...
    context/       # Auth + Region context
    api/           # API client, Cognito, media/region helpers
template.yaml      # AWS SAM infrastructure (all resources)
deploy.ps1         # one-shot deploy helper
DEPLOY.md          # full step-by-step deployment guide
```

## Run locally (no AWS needed)

Requires **Node.js 22+**. The local server uses an in-memory, file-persisted DB and a
dev-auth shim, so every feature works with zero AWS dependencies.

```bash
# Backend (in-memory DB, http://localhost:4000)
cd backend
npm install
npm run seed:mem        # seed demo data
npm run dev:mem         # start the local API

# Frontend (http://localhost:5173)
cd ../frontend
npm install
npm run dev
```

> **Videos:** large demo `.mp4` files are git-ignored (hundreds of MB). The app falls
> back to SVG posters automatically. To use real clips, drop them into
> `frontend/public/videos/` (see that folder's `README.md` for expected filenames).

## Deploy to AWS

**Complete, beginner-friendly, step-by-step instructions are in [DEPLOY.md](DEPLOY.md)** —
prerequisites, credentials, the TLS/esbuild gotchas, every command, and teardown.

Short version:

```bash
# 0. install: Node 22, AWS CLI, SAM CLI, and `npm i -g esbuild`
aws configure                 # keys + region (we used ap-south-1)

# 1. backend
sam build
sam deploy --guided           # first time; Stage=dev, BedrockEnabled=true, allow IAM role creation

# 2. frontend — copy the stack Outputs into frontend/.env.production, then:
cd frontend && npm install && npm run build && cd ..
aws s3 sync frontend/dist "s3://<SiteBucketName>" --delete
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
```

`sam deploy` prints an **Outputs** block — `SiteUrl` is your live URL. Create an
authority login (authorities never self-signup):

```bash
cd backend
# env: AWS_REGION, USER_POOL_ID (from outputs), TABLE_NAME
npx tsx src/local/provisionAuthority.ts --email you@example.com --password "Pass@12345" \
  --name "Officer Name" --taluk BELUR --designation "Taluk Water Officer" --department "Minor Irrigation Dept."
```

## Testing

```bash
cd backend
npm test                 # Vitest unit tests (recurring detection, reward eligibility, validation)
# end-to-end smoke scripts live in src/local/*Smoke.ts (run against the local server)
```

## Key engineering decisions

- **Single-table DynamoDB** with one GSI serves role-partitioned community lists, authority/alert listings, and 1:1 messaging inboxes (a membership-pointer pattern lets both participants query their own inbox).
- **Public-by-default API with in-Lambda JWT decode** — anonymous reporting stays frictionless, while logged-in users are still identified (no authorizer that would 401 anonymous calls).
- **Server-authoritative identity** — the backend always resolves a user's display name from their saved profile, so comments/reports/messages show the real profile name (email handle only as a pre-setup fallback).
- **Idempotent monthly alerts** — deterministic IDs keyed by `(taluk, YYYY-MM)` so re-running overwrites rather than duplicates.
- **Same code locally and in the cloud** — one shared router runs under Express locally and under API Gateway/Lambda in AWS.
- **Deploy fixes baked in:** resolved a Cognito↔Lambda CloudFormation circular dependency; bundle Lambdas as CommonJS to avoid an ESM `node:https` require error; strip the API Gateway stage prefix in the router.

## Ethics & guardrails

- Scope is strictly **water-only** (pollution, leakage, hazards, floods).
- Anonymous reporting needs **no login**; rewards require a **verified cleanup**, never a report.
- AI awareness posts **never accuse or name individuals** — only the problem, place, and evidence.
- Secrets/config live in SSM; thresholds and reward amounts are configurable, never hard-coded.

---

*Prepared for a hackathon submission. Region data covers Karnataka → Hassan (8 taluks); the architecture scales to all-India with a larger region dataset.*
