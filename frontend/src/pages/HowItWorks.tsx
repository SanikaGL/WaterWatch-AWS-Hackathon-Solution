// A single page that explains everything WaterWatch does, so users discover every
// feature and understand how the pieces fit together. Public, no login.
import { useNavigate } from "react-router-dom";

interface Feature {
  icon: string;
  title: string;
  body: string;
  action?: { label: string; to: string };
}

const FEATURES: Feature[] = [
  {
    icon: "📝",
    title: "Report a problem — no account needed",
    body: "Spotted pollution, a leak, or a water hazard? Report it anonymously in seconds. No signup, no login. Add a photo or video and the exact spot in your region.",
    action: { label: "Report now", to: "/report" },
  },
  {
    icon: "🗺️",
    title: "Your region, in focus",
    body: "Pick your region (State → District → Taluk) and see everything local: active floods, water bodies, recent reports, upcoming events, and the people who protect your water.",
    action: { label: "Explore regions", to: "/regions" },
  },
  {
    icon: "🚨",
    title: "Flood incidents, live",
    body: "During a flood, anyone can post live updates with photos and the hazard type. Each incident page also shows volunteer response events you can join.",
    action: { label: "See floods", to: "/floods" },
  },
  {
    icon: "📣",
    title: "Volunteers",
    body: "Volunteers organize cleanups and awareness drives, and post updates. Browse them, search by name or region, and join their events. Sign up free to become one.",
    action: { label: "Meet volunteers", to: "/volunteers" },
  },
  {
    icon: "🧹",
    title: "Cleaners",
    body: "Cleaners physically restore water bodies and submit before/after evidence to get verified. Find verified cleaners near you and follow their work.",
    action: { label: "Meet cleaners", to: "/cleaners" },
  },
  {
    icon: "🏛️",
    title: "Regional authorities",
    body: "Every taluk has a designated water authority responsible for reports, floods and verification. Verified volunteers and cleaners can message them directly.",
    action: { label: "View authorities", to: "/authorities" },
  },
  {
    icon: "💬",
    title: "Direct messaging",
    body: "A private 1:1 channel between verified members and their region's authority — for coordination, verification, and reward follow-up. Login required on both sides.",
    action: { label: "Open messages", to: "/messages" },
  },
  {
    icon: "🤖",
    title: "AI community alerts",
    body: "When a water body gets too many reports, and once a month for the most-polluted spot in each region, our AI writes an evidence-based awareness alert — with real photo/video proof, never naming or blaming anyone.",
    action: { label: "See alerts", to: "/alerts" },
  },
];

const STEPS = [
  { n: 1, t: "Report", d: "Anyone reports a water problem — anonymously, no account." },
  { n: 2, t: "Connect", d: "Reports are grouped with nearby and related problems." },
  { n: 3, t: "Act", d: "Volunteers run events; cleaners take verified cleanup actions." },
  { n: 4, t: "Resolve", d: "Authorities track and update resolution for their region." },
  { n: 5, t: "Aware", d: "Recurring and monthly problems trigger automatic awareness alerts." },
];

export function HowItWorks() {
  const navigate = useNavigate();
  return (
    <>
      <header className="how-hero">
        <div className="container">
          <h1>How WaterWatch works</h1>
          <p>A citizen water-safety platform: report problems, respond to floods, organize cleanups, and let the community — and AI — keep everyone aware. Here's everything you can do.</p>
          <div className="row" style={{ gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/report")}>Report a problem</button>
            <button className="btn btn-ghost btn-lg" onClick={() => navigate("/regions")}>Explore your region</button>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="container">
          <h2>From a single report to real-world action</h2>
          <p className="sub">Five steps, one goal: safer water.</p>
          <div className="how-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="how-step">
                <div className="how-step-n">{s.n}</div>
                <div>
                  <strong>{s.t}</strong>
                  <p>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "#fff", borderTop: "1px solid var(--line)" }}>
        <div className="container">
          <h2>Every feature, explained</h2>
          <p className="sub">Tap any card to try it.</p>
          <div className="how-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="how-card">
                <div className="how-card-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
                {f.action && (
                  <button className="btn btn-ghost" onClick={() => navigate(f.action!.to)}>{f.action.label} →</button>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container how-cta">
          <h2>Ready to protect the water around you?</h2>
          <p className="sub">Start with a report — it takes seconds and needs no account.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate("/report")}>Report a water problem</button>
        </div>
      </section>
    </>
  );
}
