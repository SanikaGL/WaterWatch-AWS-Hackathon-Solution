# WaterWatch — Always-on project rules

This project is WaterWatch, a citizen water-safety platform. Full spec lives in
`.kiro/specs/waterwatch/{requirements,design,tasks}.md`. Follow it.

## Non-negotiables
- Scope is water-only. Reject generic garbage/cleanliness/recycling/social-network features.
- Region is the central filter: State > District > Taluk (operational Region) > water body.
  Display identity is always "Taluk, District, State". Filter by stable IDs (stateId,
  districtId, talukId, waterBodyId), never by display names.
- Anonymous reporting requires NO login. Reward requires a VERIFIED cleanup action, never a report.
- Recurring-issue AI posts must NEVER accuse or name an individual.
- Serverless only. Do NOT introduce EC2/ASG/ALB/Redis/RDS/ECS/EKS/SageMaker/OpenSearch.
- All AWS infra via SAM `template.yaml`. No manual console resource creation.
- Reward amount and recurring thresholds are configurable, never hard-coded promises.

## Auth & social (REAL — do not fake)
- Cognito is REAL. One User Pool, groups: volunteer, cleaner, authority. API Gateway JWT authorizer.
- Volunteer account != Cleaner account. Volunteer organizes events/awareness; Cleaner physically
  cleans, submits before/after evidence, gets verified, earns reward. Citizens stay anonymous.
- Instagram publishing is REAL (Instagram Graph API, IG Business account + token from SSM).
  Twitter/LinkedIn optional/simulated. If IG creds absent, fall back to SIMULATED_PUBLISHED.
- Secrets/config (IG token, reward amount, thresholds) live in SSM Parameter Store, never in code.

## 3-day constraints
- Prefer local testing (unit + sam local). Deploy to `waterwatch-dev` before `waterwatch-prod`.
- Build phase-by-phase; verify end-to-end before moving on.
- Cost-optimized AWS: HTTP API (not REST), DynamoDB on-demand, Lambda, S3/CloudFront, Cognito,
  EventBridge, Bedrock, SNS, SSM, CloudWatch — all serverless/pay-per-use.

## UX
- Mobile-first, responsive, clean and intentional (not a generic AI gradient look).
- Every data view needs loading/empty/error states; empty = calm, never broken-looking.
- Use psychology: flood urgency, frictionless reporting, visible community momentum.
