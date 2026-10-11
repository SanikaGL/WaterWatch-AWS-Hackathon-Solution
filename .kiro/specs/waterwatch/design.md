# WaterWatch — Design & AWS Architecture

## 1. High-level architecture (serverless, SAM-defined)

```
React + TS + Vite  (S3 + CloudFront)
        |
   API Gateway (public API)
        |
   AWS Lambda  (one function per domain)
        |
   DynamoDB (single-table)   S3 (media)
        |
   EventBridge  ->  recurring-issue eval, post generation
   Bedrock      ->  classification, summaries, post text
   SNS          ->  flood/event/authority notifications
   Cognito      ->  volunteer/authority identity (citizen reporting stays anonymous)
   CloudWatch   ->  logs, errors, latency, metrics
```

All infra is defined in `template.yaml` (AWS SAM). Kiro must NOT create AWS resources by hand in the console.

## 2. Lambda functions (logical separation)
- `report`      — create/list/get reports, status update, comments
- `flood`       — floods list/get/create, status
- `floodUpdate` — citizen flood updates
- `waterBody`   — water bodies list/get
- `region`      — region tree (state/district/taluk) + region summaries
- `volunteer`   — volunteer/cleaner global profiles (Cognito-backed)
- `event`       — volunteer events (region-specific; organizer = volunteer group)
- `cleanup`     — claim/evidence/verify/reward eligibility (cleaner group, verified)
- `authority`   — dashboard aggregates + status updates
- `recurring`   — threshold evaluation (EventBridge target)
- `socialPost`  — generate (Bedrock) + simulate publish

For the 3-day build, several of these may share a single routing Lambda to save time; keep the handler code logically separated by module.

## 3. DynamoDB single-table design
Table: `waterwatch-<stage>`  (PK, SK + GSIs). Access patterns drive the keys.

### Entities & keys
| Entity        | PK                      | SK                         | Notes |
|---------------|-------------------------|----------------------------|-------|
| Region (taluk)| `REGION#<talukId>`      | `META`                     | has stateId/districtId |
| Report        | `REGION#<talukId>`      | `REPORT#<ts>#<reportId>`   | query by region + time |
| Report (byWB) | GSI1: `WB#<waterBodyId>`| `REPORT#<ts>#<reportId>`   | query by water body |
| Comment       | `REPORT#<reportId>`     | `COMMENT#<ts>#<commentId>` | |
| Flood         | `FLOOD#ALL`             | `FLOOD#<ts>#<floodId>`     | global list |
| Flood (byReg) | GSI1: `REGION#<talukId>`| `FLOOD#<ts>#<floodId>`     | region list |
| FloodUpdate   | `FLOOD#<floodId>`       | `UPDATE#<ts>#<updateId>`   | |
| WaterBody     | `REGION#<talukId>`      | `WB#<waterBodyId>`         | |
| Volunteer     | `VOL#<volunteerId>`     | `META`                     | global |
| Event         | `REGION#<talukId>`      | `EVENT#<date>#<eventId>`   | region-specific |
| Cleanup       | `CLEANUP#<cleanupId>`   | `META`                     | reward status |
| RecurringIssue| `REGION#<talukId>`      | `RECUR#<waterBodyId>`      | |
| SocialPost    | `POST#ALL`              | `POST#<ts>#<postId>`       | publication status |

GSI1 (`GSI1PK`,`GSI1SK`) powers water-body and region-flood lookups.

### Stable ID rule
Every regional item stores `stateId`, `districtId`, `talukId`, and optional `waterBodyId`. Filtering ALWAYS uses IDs, never display names.

## 4. Media (S3)
- Bucket `waterwatch-media-<stage>`. Client uploads via presigned PUT URL from Lambda.
- DynamoDB stores the object key / reference, not the bytes.
- Prefixes: `reports/`, `floods/`, `cleanup/before/`, `cleanup/after/`, `awareness/`.

## 5. AI (Bedrock)
- Model: Claude on Bedrock (region configurable, default us-east-1). Guard with a local deterministic fallback so the demo never hard-fails if model access is missing.
- Uses: optional report classification, recurring-issue summary, awareness post text.
- Prompt rule enforced in code + prompt: never name or accuse individuals.

## 6. Event-driven flow
```
New report  -> EventBridge -> recurring eval (threshold check)
Threshold reached -> generate awareness post (Bedrock) -> store POST (status=DRAFT)
Cleanup submitted -> verification workflow (deferred/simple)
```
For 3-day build, recurring eval may also run synchronously after report create (simpler, demo-friendly) with EventBridge wired as the "production" path.

## 7. Frontend structure
```
src/
  main.tsx, App.tsx, router
  context/RegionContext.tsx      <- the "selected region" is global state
  api/client.ts                  <- single API wrapper, base URL via env
  pages/
    Home.tsx (global)            Floods.tsx       FloodDetail.tsx
    Regions.tsx (selector)       RegionHome.tsx   WaterBodyDetail.tsx
    Report.tsx                   Learn.tsx        Volunteers.tsx
    Authority.tsx
  components/ (Nav, FloodCard, ReportCard, Stat, EmptyState, VideoCarousel, ...)
  data/regions.ts                <- Karnataka > Hassan > taluks seed
```
RegionContext persists selection (localStorage). Nav shows "Select Region" or "Belur, Hassan [Change]".

## 8. Environments
```
LOCAL  ->  DEV AWS (waterwatch-dev)  ->  FINAL DEMO (waterwatch-prod)
```
Never develop straight against prod demo data.

## 8b. AWS services — final selection & why (cost-optimized, serverless)
This is an AWS hackathon; service usage is judged. Each service below earns its place.

| Service | Role in WaterWatch | Why / cost note |
|---|---|---|
| **S3** | Static frontend hosting + media storage (report/flood/cleanup images) | Pennies; pay-per-GB; no idle cost |
| **CloudFront** | CDN for the SPA + media | Fast mobile delivery; free tier generous |
| **API Gateway (HTTP API)** | Public REST entry | HTTP API is ~70% cheaper than REST API; pay-per-request |
| **Lambda** | All compute (domain handlers) | Pay-per-invocation; scales to 8k users with zero idle cost |
| **DynamoDB (on-demand)** | Single-table store | On-demand billing = no provisioned capacity cost; perfect for spiky civic traffic |
| **Cognito** | REAL auth: volunteer / cleaner / authority groups | Free tier 50k MAU; anonymous citizens never touch it |
| **EventBridge** | Decouples report-created -> recurring-issue eval -> post generation | Event-driven, cheap, no polling |
| **Bedrock** | Image understanding (classify/validate report photo) + awareness post text + recurring summary | Pay-per-token; on-demand; no infra |
| **SNS** | Flood alerts + authority/event notifications | Pennies per 1k; only where notifications add value |
| **SSM Parameter Store** | Holds IG token + reward config + thresholds (SecureString) | Free standard tier; keeps secrets out of code |
| **CloudWatch** | Logs, errors, latency, metrics, alarms | Operational visibility; cheap at this scale |
| **SAM** | IaC for everything above | Reproducible, no console clicking; required discipline |

Deliberately NOT used (would add idle cost / complexity with no benefit here):
EC2, Auto Scaling, ALB, RDS, Redis/ElastiCache, ECS, EKS, SageMaker, OpenSearch.
Rationale: ~8k participants is spiky, low-sustained load. Serverless pay-per-use beats
always-on fleets on both cost and ops. The whole stack idles at ~$0 when unused.

## 5b. Auth model (Cognito — real)
- One Cognito User Pool with groups: `volunteer`, `cleaner`, `authority`.
- Hosted UI or Amplify Auth on the frontend; API Gateway uses a JWT authorizer validating the Cognito token.
- Anonymous citizen reporting hits PUBLIC (no-auth) routes; account routes require a valid JWT with the right group.
- Reward eligibility requires `cleaner` group + verified flag.

## 5c. Instagram publishing (real)
- `socialPost` Lambda: generate text via Bedrock, then POST to Instagram Graph API
  (`/{ig-user-id}/media` then `/{ig-user-id}/media_publish`) using `IG_ACCESS_TOKEN`.
- Image must be a public S3/CloudFront URL (IG requires a public image URL).
- Credentials from SSM Parameter Store (SecureString). Absent creds -> `SIMULATED_PUBLISHED`.

## 9. Design language (psychology)
- Floods = red/alert, animated "N responding" to signal momentum and urgency.
- Reporting = biggest, most frictionless button; "No account needed" reassurance.
- Momentum: show counts ("12 citizen updates", "8 volunteers responding").
- Calm empty states (green "all clear") so the site never looks broken.
- Palette: deep water blue, teal, white, alert red; generous spacing; one accent font. Avoid the generic purple-gradient AI look.
