# WaterWatch — Requirements

## 1. What this is
WaterWatch is a citizen-led water-safety and response platform. Every feature must answer:
**"Does this help protect, conserve, respond to, or improve water safety?"**

Scope is strictly water-connected:
- Floods and water emergencies
- Pollution of water bodies
- Water leakage / water wastage
- Water-related safety hazards
- Community cleanup / action
- Rewards for verified cleanup
- Automatic escalation of recurring water problems
- Water-safety awareness and education

### Explicitly NOT building
Generic garbage/cleanliness reporting, recycling, a social network, flood prediction, a generic complaint portal.

## 2. Core concept: Selected Region
The site has a **current region context**. Hierarchy:

```
Country (India) > State > District > Taluk (= operational Region) > exact location / water body
```

- Before a region is selected: homepage shows GLOBAL context (awareness + active floods + region selector + how it works).
- After a region is selected: everything is filtered to that region.
- Display identity is always **State + District + Taluk**, e.g. "Belur Taluk, Hassan District, Karnataka" (compact: "Belur, Hassan").
- There is NO "Water Bodies" top-level nav item. Water bodies live INSIDE a region.

Every regional entity MUST carry stable IDs (never names) for filtering:
```
stateId, districtId, talukId   (+ optional waterBodyId)
```

## 3. Functional requirements

### 3.1 Reporting (anonymous, no login)
- Report types: Water Pollution, Water Leakage, Water Safety Hazard (Flood is its own system).
- Fields: type, photo/video (S3), exact location (map/GPS/search), description, "when noticed".
- Report inherits region IDs from current context; exact location can derive region.
- Status lifecycle: Reported -> Under Review -> Verified -> Assigned -> Resolved.
- Pollution must have a water connection (lake/river/pond/reservoir/canal). Roadside/street garbage is out of scope.

### 3.2 Comments (community confirmation)
- Reports support comments ("I saw this too", upvotes).
- Comments are community confirmation, NOT official verification. Official status comes from the verification process.

### 3.3 Floods (incident system)
- Global active-flood layer visible on landing (exception to region filtering).
- Also shown filtered inside the matching region. ONE flood record, many display contexts.
- Flood detail: location, severity, status (ACTIVE/...), citizen update count, volunteer count.
- Citizen live updates: text, photo/video, location, hazard type (road blocked, electrical hazard, person needs help, etc.). Upvotes/comments on updates.

### 3.4 Water bodies (nested in region)
- Listed under a region's pollution view (e.g., Belur Lake, Yagachi River) with report counts + status.
- Water-body detail (nested, not top-level): status, report counts, recent/historical reports, comments, cleanup history, active events, recurring problems.

### 3.5 Accounts & roles (REAL Cognito — not mocked)
Three identities exist. Citizen reporting stays anonymous (no account). The two
account types below are DIFFERENT roles with different permissions, both backed by a
real Amazon Cognito User Pool (groups = roles).

**(a) Volunteer / Organizer account** (`volunteer` group)
- Creates and organizes region-specific cleanup events.
- Posts / triggers awareness content.
- Global profile: name, bio, points, events organized, badges, regions helped.

**(b) Cleaner account — verified** (`cleaner` group)
- The person who physically cleans a water body on their own initiative.
- Claims an eligible verified issue, submits BEFORE evidence, performs cleanup,
  submits AFTER evidence, gets verified, becomes reward-eligible.
- Must be a verified account before reward eligibility.

**(c) Authority account** (`authority` group)
- Separate dashboard; verifies reports/cleanups and updates status (see 3.9).

- Events are region-specific (talukId + optional waterBodyId); appear on region page,
  water-body page, and the organizer's profile. NOT on unrelated regions.
- Volunteer/cleaner profiles are GLOBAL; events are regional.

#### Signup & authentication flow (authoritative)
- Citizens do NOT need an account to submit reports.
- Volunteers and cleaners self-sign-up via the Cognito **hosted UI** auth flow.
- Signup requires **email verification** before first login.
- On successful auth, Cognito issues **JWT tokens** (id/access/refresh).
- Each user is placed in the appropriate Cognito group: `volunteer`, `cleaner`, or `authority`.
  - At signup the user picks volunteer or cleaner; the app assigns that group
    (e.g. via a post-confirmation Lambda trigger). Self-selecting `authority` is NOT allowed.
- `authority` group membership is **system/admin controlled** (assigned out-of-band,
  e.g. admin action / seeded user), never self-assignable.
- Protected API routes use **API Gateway JWT authorizer** (validates the Cognito JWT and group claim).
- Public routes (anonymous citizen reporting, read-only lists) require no token.

### 3.6 Cleanup + rewards
- Reporting alone NEVER earns a reward. Reward is tied to a VERIFIED cleanup ACTION by a verified Cleaner account.
- Flow: cleaner account (verified) -> find eligible issue -> claim action -> BEFORE evidence -> cleanup -> AFTER evidence -> authority/AI verification -> reward eligibility.
- Reward amount is CONFIGURABLE (never hard-code a government payment promise).
- Reward eligibility logic must be unit-testable.

### 3.7 Recurring-issue auto-detection (signature feature)
- Trigger when N independent reports concern the same water body/location within T days.
- Configurable: `REPORT_THRESHOLD` (default 5), `TIME_WINDOW_DAYS` (default 30).
- On threshold: group reports -> Bedrock summary -> auto-generate awareness post.
- Post record stores: postId, source reports, waterBody, generated content, created time, publication status.
- **Critical rule:** AI must NEVER accuse or identify an individual. It reports the environmental problem, location, and evidence only.

### 3.8 Automatic awareness posts / social
- Bedrock generates the awareness post text (and may use the report image via Bedrock image understanding).
- **Instagram is the primary real channel** (chosen because it is the most widely recognized app, usable even by low-literacy users). Implemented for real via the Instagram Graph API (Instagram Business/Creator account + a Meta app Page token). Requires an IG Business account id + a long-lived access token supplied as config/secret.
- Twitter/X and LinkedIn are optional and simulated unless keys are provided.
- Config/secrets (never hard-coded): `IG_BUSINESS_ACCOUNT_ID`, `IG_ACCESS_TOKEN` (stored in SSM Parameter Store / env, not in code).
- Fallback: if IG credentials are absent, publishing is marked `SIMULATED_PUBLISHED` with a preview so the demo never breaks.
- NOTE on timeline: getting a Meta app approved for public use takes days; for the hackathon demo we use an IG Business account + token the team already controls (dev/test mode), which does not require full app review to post to the connected account.

### 3.9 Authority dashboard
- Separate authenticated interface (minimal for demo).
- Sees totals: reports, active floods, pollution, leakage, recurring issues, volunteer actions, pending verification, resolved.
- Can update report/flood status -> closes the loop.

## 4. Non-functional requirements
- Mobile-first, web-first, responsive. Clean and intentional, NOT a generic AI-generated look.
- Human-psychology aware: flood urgency (red, movement count), low-friction anonymous reporting, visible community momentum (counts, "X citizens reported").
- Serverless, no servers to maintain. ~8,000 participants => variable load handled by serverless, not fleets.
- Loading, empty, and error states for every data view (empty flood list shows a calm green "no active incidents", never a broken UI).
- Accessibility-compliant components.

## 5. Out of scope (do NOT introduce without explicit decision)
EC2, Auto Scaling, ALB, Redis, RDS, ECS, EKS, SageMaker, OpenSearch.
