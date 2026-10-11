import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { RegionSummary, Report, WaterBody, VolunteerEvent, VolunteerProfile, AuthorityProfile } from "../types";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { FloodCard } from "../components/FloodCard";
import { ReportCard } from "../components/ReportCard";
import { EventCard } from "../components/EventCard";
import { Avatar } from "../components/Avatar";
import { SectionNav } from "../components/SectionNav";
import { useRegion, regionLabel } from "../context/RegionContext";
import { useAuth } from "../context/AuthContext";

const wbStatusBadge: Record<WaterBody["status"], string> = {
  OK: "badge-ok", MONITORING: "badge-warn", NEEDS_ATTENTION: "badge-alert",
};

export function RegionHome() {
  const navigate = useNavigate();
  const { region } = useRegion();
  const { isVolunteer } = useAuth();
  const [summary, setSummary] = useState<RegionSummary | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [waterBodies, setWaterBodies] = useState<WaterBody[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<VolunteerEvent[]>([]);
  const [localVols, setLocalVols] = useState<VolunteerProfile[]>([]);
  const [localCleaners, setLocalCleaners] = useState<VolunteerProfile[]>([]);
  const [localAuths, setLocalAuths] = useState<AuthorityProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(talukId: string) {
    setError(null); setSummary(null);
    try {
      const [s, r, w, e, vols, cleaners, auths] = await Promise.all([
        api.get<RegionSummary>(`/regions/${talukId}/summary`),
        api.get<{ reports: Report[] }>(`/regions/${talukId}/reports`),
        api.get<{ waterBodies: WaterBody[] }>(`/regions/${talukId}/waterbodies`),
        api.get<{ upcoming: VolunteerEvent[] }>(`/regions/${talukId}/events`),
        api.get<{ volunteers: VolunteerProfile[] }>(`/volunteers?talukId=${talukId}`),
        api.get<{ cleaners: VolunteerProfile[] }>(`/cleaners?talukId=${talukId}`),
        api.get<{ authorities: AuthorityProfile[] }>(`/authorities?talukId=${talukId}`),
      ]);
      setSummary(s);
      setReports(r.reports);
      setWaterBodies(w.waterBodies);
      setUpcomingEvents(e.upcoming);
      setLocalVols(vols.volunteers);
      setLocalCleaners(cleaners.cleaners);
      setLocalAuths(auths.authorities);
    } catch (e) { setError((e as Error).message); }
  }

  useEffect(() => {
    if (!region) { navigate("/regions"); return; }
    load(region.talukId);
  }, [region?.talukId]);

  if (!region) return null;
  const c = summary?.counts;

  return (
    <section className="section">
      <div className="container">
        <h2 style={{ marginBottom: 2 }}>📍 {region.talukName} Region</h2>
        <p className="sub">{regionLabel(region)} — Water Safety Overview</p>

        {error && <ErrorState message={error} onRetry={() => load(region.talukId)} />}
        {!error && !summary && <Loading label="Loading your region..." />}

        {summary && (
          <>
            <div className="grid grid-3" style={{ marginBottom: 10 }}>
              <div className="card stat"><div className="num">{c!.activeFloods}</div><div className="lbl">🚨 Active floods</div></div>
              <div className="card stat"><div className="num">{c!.pollution}</div><div className="lbl">🏞️ Pollution reports</div></div>
              <div className="card stat"><div className="num">{c!.leakage}</div><div className="lbl">💧 Water leaks</div></div>
            </div>
            <div className="grid grid-3">
              <div className="card stat"><div className="num">{c!.hazard}</div><div className="lbl">⚠️ Water hazards</div></div>
              <div className="card stat"><div className="num">{c!.waterBodies}</div><div className="lbl">🌊 Water bodies</div></div>
              <div className="card stat"><div className="num">{c!.recurring}</div><div className="lbl">🔁 Recurring issues</div></div>
            </div>

            {/* Signpost: what's on this region page */}
            <SectionNav links={[
              { id: "rh-floods", label: "Floods", count: summary.activeFloods.length },
              { id: "rh-waterbodies", label: "Water bodies", count: waterBodies.length },
              { id: "rh-events", label: "Events", count: upcomingEvents.length },
              { id: "rh-people", label: "People", count: localAuths.length + localVols.length + localCleaners.length },
              { id: "rh-reports", label: "Reports", count: reports.length },
            ]} />

            {/* Active floods in region */}
            <h3 id="rh-floods" className="section-anchor" style={{ marginTop: 30 }}>🚨 Active flood incidents</h3>
            {summary.activeFloods.length === 0 ? (
              <EmptyState>🟢 No active flood incidents currently reported in {region.talukName}.</EmptyState>
            ) : (
              <div className="grid grid-3">
                {summary.activeFloods.map((f) => <FloodCard key={f.floodId} flood={f} />)}
              </div>
            )}

            {/* What you can do here */}
            <h3 style={{ marginTop: 30 }}>What can you do in {region.talukName}?</h3>
            <div className="grid grid-3">
              <button className="chip" style={{ padding: 24 }} onClick={() => navigate("/report?type=POLLUTION")}>
                <span className="emoji">🏞️</span> Report water pollution<br /><span className="tag">No login required</span>
              </button>
              <button className="chip" style={{ padding: 24 }} onClick={() => navigate("/report?type=LEAKAGE")}>
                <span className="emoji">💧</span> Report water leakage<br /><span className="tag">No login required</span>
              </button>
              <button className="chip" style={{ padding: 24 }} onClick={() => navigate("/report?type=HAZARD")}>
                <span className="emoji">⚠️</span> Report water hazard<br /><span className="tag">No login required</span>
              </button>
            </div>

            {/* Water bodies in region */}
            <h3 id="rh-waterbodies" className="section-anchor" style={{ marginTop: 30 }}>🌊 Water bodies in {region.talukName}</h3>
            {waterBodies.length === 0 ? (
              <EmptyState>No water bodies registered for {region.talukName} yet.</EmptyState>
            ) : (
              <div className="grid grid-2">
                {waterBodies.map((w) => (
                  <div key={w.waterBodyId} className="card card-pad" style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/waterbody/${w.waterBodyId}`)}>
                    <div className="row space-between">
                      <strong>{w.name}</strong>
                      <span className={`badge ${wbStatusBadge[w.status]}`}>{w.status.replace(/_/g, " ")}</span>
                    </div>
                    <div className="tag" style={{ marginTop: 6 }}>
                      {w.kind} · {w.counts?.pollution ?? 0} pollution · {w.counts?.leakage ?? 0} leakage
                    </div>
                    <div className="row" style={{ marginTop: 10 }}>
                      <span className="btn btn-ghost">View reports →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Volunteer events in region */}
            <div id="rh-events" className="section-anchor row space-between" style={{ marginTop: 30 }}>
              <h3 style={{ margin: 0 }}>🤝 Volunteer events in {region.talukName}</h3>
              {isVolunteer && (
                <button className="btn btn-ghost" onClick={() => navigate("/events/new")}>+ Create event</button>
              )}
            </div>
            {upcomingEvents.length === 0 ? (
              <EmptyState>
                No upcoming volunteer events in {region.talukName}.{" "}
                {isVolunteer
                  ? "Create the first one."
                  : <>Join the community to organize one — <a href="/account?role=volunteer">become a volunteer</a>.</>}
              </EmptyState>
            ) : (
              <div className="grid grid-2">
                {upcomingEvents.map((ev) => (
                  <EventCard key={ev.eventId} event={ev} />
                ))}
              </div>
            )}

            {/* People native to this region */}
            <h3 id="rh-people" className="section-anchor" style={{ marginTop: 30 }}>👥 People in {region.talukName}</h3>
            {localAuths.length + localVols.length + localCleaners.length === 0 ? (
              <EmptyState>No registered authorities, volunteers or cleaners in {region.talukName} yet.</EmptyState>
            ) : (
              <div className="region-people">
                {localAuths.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="tag" style={{ marginBottom: 8 }}>🏛️ Authorities</div>
                    <div className="people-strip">
                      {localAuths.map((a) => (
                        <button key={a.authorityId} className="people-chip" onClick={() => navigate(`/authorities/${a.authorityId}`)}>
                          <Avatar name={a.name} avatarKey={a.avatarKey} size={34} />
                          <span><span className="pc-name">{a.name}</span><br /><span className="pc-role">{a.designation}</span></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {localVols.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="tag" style={{ marginBottom: 8 }}>📣 Volunteers</div>
                    <div className="people-strip">
                      {localVols.map((v) => (
                        <button key={v.volunteerId} className="people-chip" onClick={() => navigate(`/volunteers/${v.volunteerId}`)}>
                          <Avatar name={v.name} avatarKey={v.avatarKey} size={34} />
                          <span><span className="pc-name">{v.name}</span><br /><span className="pc-role">{v.eventsConducted} events</span></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {localCleaners.length > 0 && (
                  <div>
                    <div className="tag" style={{ marginBottom: 8 }}>🧹 Cleaners</div>
                    <div className="people-strip">
                      {localCleaners.map((c) => (
                        <button key={c.volunteerId} className="people-chip" onClick={() => navigate(`/cleaners/${c.volunteerId}`)}>
                          <Avatar name={c.name} avatarKey={c.avatarKey} size={34} />
                          <span><span className="pc-name">{c.name}</span><br /><span className="pc-role">Verified cleaner</span></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recurring problems */}
            {summary.recurring.length > 0 && (
              <>
                <h3 style={{ marginTop: 30 }}>🔁 Recurring water problems</h3>
                <div className="state state-error" style={{ textAlign: "left" }}>
                  {summary.recurring.length} location{summary.recurring.length > 1 ? "s have" : " has"} crossed
                  the recurring-issue threshold in {region.talukName}. Awareness alerts have been
                  generated automatically — see the <a href="/alerts">Community Alerts</a> page.
                </div>
              </>
            )}

            {/* Recent reports in region */}
            <h3 id="rh-reports" className="section-anchor" style={{ marginTop: 30 }}>Recent reports in {region.talukName}</h3>
            {reports.length === 0 ? (
              <EmptyState>No reports yet in {region.talukName}. Be the first to report a water problem.</EmptyState>
            ) : (
              <div className="grid grid-2">
                {reports.slice(0, 8).map((r) => (
                  <ReportCard key={r.reportId} report={r}
                    onClick={() => navigate(`/reports/${r.reportId}?taluk=${region.talukId}&at=${encodeURIComponent(r.createdAt)}`)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
