// Single source of truth for all routes. Imported by Lambda + local Express.
import { Router } from "./router.js";
import { ok } from "./types.js";
import * as reports from "../handlers/reports.js";
import * as regions from "../handlers/regions.js";
import * as media from "../handlers/media.js";
import * as floods from "../handlers/floods.js";
import * as social from "../handlers/social.js";
import * as authority from "../handlers/authority.js";
import * as volunteers from "../handlers/volunteers.js";
import * as messages from "../handlers/messages.js";

export function buildRouter(): Router {
  const r = new Router();

  // Health
  r.get("/health", async () => ok({ status: "ok", service: "waterwatch", time: new Date().toISOString() }));

  // Regions
  r.get("/regions", regions.getRegionTree);
  r.get("/regions/{talukId}/summary", regions.getRegionSummary);
  r.get("/regions/{talukId}/waterbodies", regions.listWaterBodies);
  r.get("/regions/{talukId}/waterbodies/{waterBodyId}", regions.getWaterBodyDetail);

  // Reports (anonymous create + read)
  r.post("/reports", reports.createReport);
  r.get("/regions/{talukId}/reports", reports.listReportsByRegion);
  r.get("/regions/{talukId}/reports/{reportId}", reports.getReport);
  r.patch("/regions/{talukId}/reports/{reportId}/status", reports.updateReportStatus);
  r.get("/waterbodies/{waterBodyId}/reports", reports.listReportsByWaterBody);

  // Comments
  r.post("/reports/{reportId}/comments", reports.addComment);

  // Floods
  r.get("/floods", floods.listFloods);
  r.get("/floods/{floodId}", floods.getFlood);
  r.post("/floods", floods.createFlood);
  r.patch("/floods/{floodId}/status", floods.updateFloodStatus);
  r.post("/floods/{floodId}/updates", floods.addFloodUpdate);
  r.get("/regions/{talukId}/floods", floods.listFloodsByRegion);

  // Volunteers (public profiles) + events (volunteer-only create, enforced server-side)
  r.get("/volunteers", volunteers.listVolunteers);
  r.get("/volunteers/{volunteerId}", volunteers.getVolunteer);
  r.post("/volunteers/me", volunteers.upsertOwnProfile);
  r.post("/me/register", volunteers.registerSelf);
  r.post("/events", volunteers.createEvent);
  r.get("/regions/{talukId}/events", volunteers.listEventsByRegion);
  r.get("/events/{talukId}/{date}/{eventId}", volunteers.getEventDetail);
  r.patch("/events/{talukId}/{date}/{eventId}", volunteers.updateEvent);
  r.post("/events/{talukId}/{date}/{eventId}/join", volunteers.joinEvent);
  r.post("/events/{talukId}/{date}/{eventId}/leave", volunteers.leaveEvent);
  r.post("/events/{talukId}/{date}/{eventId}/updates", volunteers.postEventUpdate);
  r.post("/events/{talukId}/{date}/{eventId}/messages", volunteers.postEventMessage);

  // Cleaners (public profiles; mirror of volunteers, role-partitioned)
  r.get("/cleaners", volunteers.listCleaners);
  r.get("/cleaners/{cleanerId}", volunteers.getCleaner);
  r.post("/cleaners/me", volunteers.upsertOwnProfile);

  // Volunteer/cleaner awareness posts (volunteer OR cleaner create; anyone reads/comments)
  r.get("/posts/awareness", volunteers.listAwarenessPosts);
  r.post("/posts/awareness", volunteers.createAwarenessPost);
  r.get("/posts/awareness/{postId}", volunteers.getAwarenessPost);

  // Authorities (public directory + profile) and authority dashboard
  r.get("/authorities", authority.listAuthorities);
  r.get("/authorities/{authorityId}", authority.getAuthorityProfile);
  r.get("/authority/me", authority.me);
  r.get("/authority/overview", authority.overview);

  // Direct 1:1 messaging (verified member <-> authority; login required)
  r.get("/messages/threads", messages.listThreads);
  r.post("/messages/start", messages.startThread);
  r.get("/messages/threads/{threadId}", messages.getThread);
  r.post("/messages/threads/{threadId}", messages.postMessage);

  // Awareness alerts (public read + region search) + on-demand monthly analysis
  r.get("/posts", social.listPosts);
  r.post("/alerts/run-monthly", social.runMonthly);

  // Media upload
  r.post("/media/presign", media.presignUpload);

  return r;
}
