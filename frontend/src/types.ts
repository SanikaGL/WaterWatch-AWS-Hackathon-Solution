// Frontend-facing types (mirror of backend domain shapes we consume).
export interface TalukNode { talukId: string; talukName: string; }
export interface DistrictNode { districtId: string; districtName: string; taluks: TalukNode[]; }
export interface StateNode { stateId: string; stateName: string; districts: DistrictNode[]; }

export interface SelectedRegion {
  stateId: string; stateName: string;
  districtId: string; districtName: string;
  talukId: string; talukName: string;
}

export type ReportType = "POLLUTION" | "LEAKAGE" | "HAZARD";
export type ReportStatus = "REPORTED" | "UNDER_REVIEW" | "VERIFIED" | "ASSIGNED" | "RESOLVED";

export interface Report {
  reportId: string;
  type: ReportType;
  status: ReportStatus;
  description: string;
  locationLabel: string;
  lat?: number; lng?: number;
  media: { key: string; type: "image" | "video" }[];
  stateId: string; districtId: string; talukId: string; waterBodyId?: string;
  createdAt: string;
  upvotes: number;
  reporterId?: string;
  reporterName?: string;
  reporterRole?: "volunteer" | "cleaner" | "authority";
}

export interface Flood {
  floodId: string;
  title: string;
  locationLabel: string;
  severity: "LOW" | "MODERATE" | "SEVERE";
  status: "ACTIVE" | "MONITORING" | "RESOLVED";
  summary: string;
  media?: { key: string; type: "image" | "video" }[];
  updateCount: number;
  volunteerCount: number;
  authorityStatus: string;
  createdById?: string;
  createdByName?: string;
  regionLabel?: string;
  stateId: string; districtId: string; talukId: string;
  createdAt: string;
}

export interface WaterBody {
  waterBodyId: string; name: string;
  kind: "LAKE" | "RIVER" | "POND" | "RESERVOIR" | "CANAL";
  status: "OK" | "MONITORING" | "NEEDS_ATTENTION";
  stateId: string; districtId: string; talukId: string;
  counts?: { pollution: number; leakage: number; total: number };
}

export interface Comment {
  commentId: string;
  reportId: string;
  author: string;
  authorId?: string;
  authorRole?: "volunteer" | "cleaner" | "authority";
  text: string;
  upvotes: number;
  createdAt: string;
}

export interface RecurringIssue {
  recurringId: string;
  waterBodyId: string;
  reportCount: number;
  windowDays: number;
  talukId: string;
  createdAt: string;
}

export type AlertKind = "RECURRING" | "MONTHLY_POLLUTION";

export interface SocialPost {
  postId: string;
  kind: AlertKind;
  recurringId?: string;
  waterBodyId?: string;
  waterBodyName?: string;
  exactLocation?: string;
  regionLabel?: string;
  stateId?: string;
  districtId?: string;
  talukId?: string;
  title: string;
  content: string;
  aiSource?: "bedrock" | "fallback";
  reportCount?: number;
  windowDays?: number;
  period?: string;
  proofMedia?: { key: string; type: "image" | "video" }[];
  sourceReportIds: string[];
  createdAt: string;
}

export interface RegionSummary {
  talukId: string;
  counts: {
    activeFloods: number; pollution: number; leakage: number; hazard: number;
    waterBodies: number; events: number; recurring: number;
  };
  activeFloods: Flood[];
  recurring: unknown[];
}

export type EventKind = "CLEANUP" | "AWARENESS" | "COMMUNITY";

export interface VolunteerEvent {
  eventId: string;
  title: string;
  description: string;
  kind: EventKind;
  date: string;
  time?: string;
  locationLabel: string;
  media: { key: string; type: "image" | "video" }[];
  participants: number;
  joined?: boolean; // whether the current viewer has RSVP'd
  organizerId: string;
  organizerName: string;
  stateId: string; districtId: string; talukId: string; waterBodyId?: string;
  createdAt: string;
}

export interface ProfileLink { label: string; url: string; }

export interface EventUpdate {
  updateId: string;
  eventId: string;
  text: string;
  media: { key: string; type: "image" | "video" }[];
  createdAt: string;
}

export interface EventMessage {
  messageId: string;
  eventId: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorRole: "volunteer" | "cleaner" | "authority";
  text: string;
  createdAt: string;
}

export type CommunityRole = "volunteer" | "cleaner";

export interface VolunteerProfile {
  volunteerId: string;
  role?: CommunityRole;
  name: string;
  bio: string;
  avatarKey?: string;
  instagram?: string;
  youtube?: string;
  links: ProfileLink[];
  homeStateId?: string;
  homeDistrictId?: string;
  homeTalukId?: string;
  homeRegionLabel?: string;
  eventsConducted: number;
  badges: string[];
  profileComplete?: boolean;
  createdAt: string;
}

export interface VolunteerPost {
  postId: string;
  authorId: string;
  authorName: string;
  authorRole?: CommunityRole;
  title?: string;
  description: string;
  media: { key: string; type: "image" | "video" }[];
  stateId?: string;
  districtId?: string;
  talukId?: string;
  commentCount: number;
  createdAt: string;
}

// ---------- Authority directory ----------
export interface AuthorityProfile {
  authorityId: string;
  name: string;
  designation: string;
  department: string;
  bio: string;
  avatarKey?: string;
  email?: string;
  phone?: string;
  stateId: string;
  districtId: string;
  talukId: string;
  regionLabel?: string;
  createdAt: string;
}

// ---------- Direct messaging ----------
export type MessageRole = "volunteer" | "cleaner" | "authority";

export interface MessageParticipant {
  id: string;
  name: string;
  role: MessageRole;
  regionLabel?: string;
}

export interface InboxThread {
  threadId: string;
  other: MessageParticipant;
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt: string;
}

export interface MessageThread {
  threadId: string;
  participantIds: [string, string];
  participants: MessageParticipant[];
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
  senderRole: MessageRole;
  text: string;
  createdAt: string;
}
