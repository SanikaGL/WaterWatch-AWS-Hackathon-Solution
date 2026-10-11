// Core domain types for WaterWatch.
// Every regional entity carries stable IDs (never display names) for filtering.

export type ReportType = "POLLUTION" | "LEAKAGE" | "HAZARD";

export type ReportStatus =
  | "REPORTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "ASSIGNED"
  | "RESOLVED";

export type FloodStatus = "ACTIVE" | "MONITORING" | "RESOLVED";
export type Severity = "LOW" | "MODERATE" | "SEVERE";

export interface RegionRef {
  stateId: string;
  districtId: string;
  talukId: string;
  waterBodyId?: string;
}

export interface MediaRef {
  key: string; // S3 object key
  type: "image" | "video";
}

export interface Report extends RegionRef {
  reportId: string;
  type: ReportType;
  status: ReportStatus;
  description: string;
  locationLabel: string; // human readable, e.g. "Northern bank, Belur Lake"
  lat?: number;
  lng?: number;
  media: MediaRef[];
  noticedWhen?: string; // "today" | "yesterday" | "past_week" | "not_sure"
  createdAt: string; // ISO
  upvotes: number;
  // Attribution: anonymous citizen if absent; identified when a logged-in user reports.
  reporterId?: string;
  reporterName?: string;
  reporterRole?: "volunteer" | "cleaner" | "authority";
}

export type AuthorRole = "volunteer" | "cleaner" | "authority";

export interface Comment {
  commentId: string;
  // Comments attach to either a report or a volunteer post. targetId holds whichever.
  reportId: string; // = target id (report or post)
  author: string; // display name (Anonymous for guests)
  authorId?: string; // Cognito sub when logged in
  authorRole?: AuthorRole; // real identity badge when logged in
  text: string;
  upvotes: number;
  createdAt: string;
}

export interface Flood extends RegionRef {
  floodId: string;
  title: string;
  locationLabel: string;
  severity: Severity;
  status: FloodStatus;
  summary: string;
  media: MediaRef[];        // incident photo(s) added by the authority
  updateCount: number;
  volunteerCount: number;
  authorityStatus: string;  // e.g. "Notified"
  // Who declared this incident (the region's authority).
  createdById?: string;
  createdByName?: string;
  regionLabel?: string;     // "Taluk, District, State" for display
  createdAt: string;
}

export type HazardType =
  | "ROAD_BLOCKED"
  | "ELECTRICAL"
  | "CONTAMINATED_WATER"
  | "PERSON_NEEDS_HELP"
  | "ANIMAL_TRAPPED"
  | "OTHER";

export interface FloodUpdate {
  updateId: string;
  floodId: string;
  author: string;
  authorId?: string;      // Cognito sub when logged in
  authorRole?: AuthorRole; // real identity badge when logged in
  text: string;
  hazardType?: HazardType;
  media: MediaRef[];
  lat?: number;
  lng?: number;
  upvotes: number;
  createdAt: string;
}

export interface WaterBody extends RegionRef {
  waterBodyId: string;
  name: string;
  kind: "LAKE" | "RIVER" | "POND" | "RESERVOIR" | "CANAL";
  status: "OK" | "MONITORING" | "NEEDS_ATTENTION";
}

export type EventKind = "CLEANUP" | "AWARENESS" | "COMMUNITY";

export interface VolunteerEvent extends RegionRef {
  eventId: string;
  title: string;
  description: string;
  kind: EventKind;
  date: string;        // ISO date (YYYY-MM-DD) — the day attendees show up
  time?: string;       // "09:00"
  locationLabel: string;
  media: MediaRef[];
  // Attendance is an RSVP SET keyed by user id, so one person counts exactly once
  // (join/leave is idempotent). participants is derived from attendeeIds.length.
  attendeeIds: string[];
  participants: number;
  organizerId: string; // volunteer sub/id
  organizerName: string;
  createdAt: string;   // ISO
}

// Organizer announcement on an event (e.g. "bring gloves", "time changed").
export interface EventUpdate {
  updateId: string;
  eventId: string;
  text: string;
  media: MediaRef[];
  createdAt: string;
}

// A message in an event's discussion thread. A question has parentId undefined;
// a reply sets parentId to the question's messageId. Author identity is real for
// logged-in users (sign-in required to post).
export interface EventMessage {
  messageId: string;
  eventId: string;
  parentId?: string;       // undefined = top-level question; set = reply
  authorId: string;        // required — no anonymous posting
  authorName: string;
  authorRole: AuthorRole;
  text: string;
  createdAt: string;
}

// A labeled external link on a volunteer profile (e.g. a personal site, Facebook).
export interface ProfileLink {
  label: string;
  url: string;
}

// Community role for a public profile. Volunteers organize events/awareness;
// cleaners physically clean and submit evidence. Both are first-class profiles
// that share the exact same shape and storage (partitioned by role).
export type CommunityRole = "volunteer" | "cleaner";

// Public volunteer/community profile. NEVER includes credentials/tokens.
export interface VolunteerProfile {
  volunteerId: string;   // Cognito sub (or seeded id)
  role: CommunityRole;   // volunteer | cleaner (defaults to volunteer if absent)
  name: string;
  bio: string;
  avatarKey?: string;    // S3 key for avatar (optional)
  instagram?: string;    // optional handle or URL
  youtube?: string;      // optional channel or URL
  links: ProfileLink[];  // optional extra platform links (may be empty)
  homeStateId?: string;
  homeDistrictId?: string;
  homeTalukId?: string;
  eventsConducted: number;
  badges: string[];
  createdAt: string;
}

// Authority profile. Admin-SEEDED only (never self-signup). Each authority is
// bound to exactly one region (taluk) they are responsible for. Credentials live
// in Cognito (authority group) on AWS; this record only holds public identity +
// the region binding used for routing reports/messages.
export interface AuthorityProfile {
  authorityId: string;   // Cognito sub (or seeded id)
  name: string;
  designation: string;   // e.g. "Taluk Water Officer"
  department: string;    // e.g. "Minor Irrigation Dept."
  bio: string;
  avatarKey?: string;
  email?: string;        // public contact (optional)
  phone?: string;        // public contact (optional)
  // Region this authority is responsible for (stable IDs; display = Taluk, District, State).
  stateId: string;
  districtId: string;
  talukId: string;
  createdAt: string;
}

// ---------- Direct messaging (1:1 threads) ----------
// A thread is strictly between two participants (a verified volunteer/cleaner and
// an authority). Login required on both sides. threadId is deterministic from the
// sorted participant ids so re-opening a conversation reuses the same thread.
export interface MessageThread {
  threadId: string;
  participantIds: [string, string];
  // Snapshot of each side's display identity so the inbox renders without extra lookups.
  participants: {
    id: string;
    name: string;
    role: AuthorRole; // volunteer | cleaner | authority
    regionLabel?: string; // "Taluk, District, State" (authority's region or member's home region)
  }[];
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt: string;
  createdAt: string;
}

export interface Message {
  messageId: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: AuthorRole;
  text: string;
  createdAt: string;
}

// A volunteer awareness post (photo/video + description). Anyone may comment.
export interface VolunteerPost {
  postId: string;
  authorId: string;      // volunteer/cleaner sub/id
  authorName: string;
  authorRole?: CommunityRole; // volunteer | cleaner (for the role badge + feed filter)
  title?: string;
  description: string;
  media: MediaRef[];
  // optional region tagging so posts can surface regionally later
  stateId?: string;
  districtId?: string;
  talukId?: string;
  commentCount: number;
  createdAt: string;
}

export interface RecurringIssue extends RegionRef {
  recurringId: string;
  waterBodyId: string;
  reportCount: number;
  windowDays: number;
  sourceReportIds: string[];
  createdAt: string;
}

// An AI-generated awareness alert. Published automatically on the Alerts page
// (no social-network posting). Carries full region + exact location + the real
// photo/video PROOF collected from the source reports.
export type AlertKind = "RECURRING" | "MONTHLY_POLLUTION";

export interface SocialPost extends RegionRef {
  postId: string;
  kind: AlertKind;              // what triggered this alert
  recurringId?: string;
  waterBodyId?: string;
  waterBodyName?: string;       // resolved display name of the water body
  exactLocation?: string;      // most-reported locationLabel, e.g. "Northern bank, Belur Lake"
  regionLabel?: string;        // "Taluk, District, State"
  title: string;
  content: string;             // AI-written awareness body (never names/accuses)
  aiSource: "bedrock" | "fallback";
  reportCount: number;         // reports behind this alert
  windowDays: number;          // analysis window
  period?: string;             // "YYYY-MM" for monthly alerts
  proofMedia: MediaRef[];      // real photos/videos from the source reports
  sourceReportIds: string[];
  createdAt: string;
}
