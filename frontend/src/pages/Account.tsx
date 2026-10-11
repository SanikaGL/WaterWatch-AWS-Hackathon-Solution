// Account: Cognito signup (volunteer OR cleaner) -> OTP email verify -> login ->
// profile setup (photo + name + bio + Instagram/YouTube/other links). Authority can
// only SIGN IN (never self-signup; pre-configured). Citizens never need an account.
// Local dev: a clearly-labeled dev login lives HERE so flows can be demoed before deploy.
import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { mediaUrl } from "../api/media";
import type { ProfileLink } from "../types";
import { useAuth } from "../context/AuthContext";
import { ErrorState } from "../components/States";
import { Avatar } from "../components/Avatar";
import { RegionSelect, type RegionValue } from "../components/RegionSelect";

type Mode = "signin" | "signup" | "confirm" | "setup";
interface PresignResponse { uploadUrl: string; key: string; }

export function Account() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const roleParam = params.get("role");
  const modeParam = params.get("mode");
  const nextPath = params.get("next") || "";
  const {
    signedIn, email: sessionEmail, groups, devRole, cognitoReady, sub,
    isVolunteer, isCleaner, signUp, confirm, resend, signIn, setDevRole, signOut, refreshProfileName,
  } = useAuth();

  const initialMode: Mode =
    modeParam === "signup" || roleParam === "volunteer" || roleParam === "cleaner" ? "signup"
    : "signin";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"volunteer" | "cleaner">(roleParam === "cleaner" ? "cleaner" : "volunteer");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Profile setup state
  const fileRef = useRef<HTMLInputElement>(null);
  const [pName, setPName] = useState("");
  const [pBio, setPBio] = useState("");
  const [avatarKey, setAvatarKey] = useState<string | undefined>();
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [home, setHome] = useState<RegionValue>({});

  // The role being set up: a cleaner session saves to /cleaners/me, else /volunteers/me.
  const setupRole: "volunteer" | "cleaner" = isCleaner ? "cleaner" : isVolunteer ? "volunteer" : role;

  async function run(fn: () => Promise<void>, after?: () => void) {
    setBusy(true); setError(null); setNotice(null);
    try { await fn(); after?.(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function uploadAvatar(file: File) {
    setError(null);
    if (file.size > 5 * 1024 * 1024) { setError("Photo must be under 5 MB."); return; }
    setUploading(true);
    try {
      const presign = await api.post<PresignResponse>("/media/presign", { prefix: "avatars", contentType: file.type });
      const put = await fetch(presign.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      setAvatarKey(presign.key);
      setAvatarPreview(URL.createObjectURL(file));
    } catch (e) { setError((e as Error).message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  function addLink() { setLinks((l) => [...l, { label: "", url: "" }]); }
  function updateLink(i: number, f: keyof ProfileLink, val: string) {
    setLinks((l) => l.map((x, idx) => (idx === i ? { ...x, [f]: val } : x)));
  }
  function removeLink(i: number) { setLinks((l) => l.filter((_, idx) => idx !== i)); }

  async function saveProfile() {
    setError(null);
    if (pName.trim().length < 2) { setError("Add your name."); return; }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        name: pName.trim(), bio: pBio.trim(),
        instagram: instagram.trim() || undefined,
        youtube: youtube.trim() || undefined,
        links: links.filter((l) => l.label.trim() && l.url.trim()),
        homeStateId: home.homeStateId,
        homeDistrictId: home.homeDistrictId,
        homeTalukId: home.homeTalukId,
      };
      if (avatarKey) payload.avatarKey = avatarKey;
      const endpoint = setupRole === "cleaner" ? "/cleaners/me" : "/volunteers/me";
      const base = setupRole === "cleaner" ? "cleaners" : "volunteers";
      const res = await api.post<{ volunteer: { volunteerId: string } }>(endpoint, payload);
      refreshProfileName(pName.trim()); // update nav/display name immediately
      // Honor ?next= (e.g. came from Create Event) else go to the new profile.
      navigate(nextPath || `/${base}/${res.volunteer.volunteerId}`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  // ---------- Signed-in: account summary (unless just-joined -> setup) ----------
  if (signedIn && mode !== "setup") {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 480 }}>
          <h2>Your account</h2>
          <div className="card card-pad">
            <p><strong>Signed in as</strong> {sessionEmail || `${devRole} (local dev)`}</p>
            <p>Role{groups.length > 1 ? "s" : ""}: {(groups.length ? groups : devRole ? [devRole] : []).map((g) => (
              <span key={g} className="badge badge-ok" style={{ marginRight: 6 }}>{g}</span>
            ))}</p>
            <div className="row">
              {isVolunteer && sub && (
                <button className="btn btn-primary" onClick={() => navigate(`/volunteers/${sub}`)}>My volunteer profile</button>
              )}
              {isCleaner && sub && (
                <button className="btn btn-primary" onClick={() => navigate(`/cleaners/${sub}`)}>My cleaner profile</button>
              )}
              {(isVolunteer || isCleaner) && <button className="btn btn-ghost" onClick={() => setMode("setup")}>Set up / edit profile</button>}
              <button className="btn btn-ghost" onClick={() => navigate("/messages")}>Messages</button>
              <button className="btn btn-ghost" onClick={() => navigate("/region")}>My region</button>
              <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ---------- Profile setup (photo + name + bio + IG/YT + links) ----------
  if (mode === "setup") {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 540 }}>
          <h2>Set up your {setupRole} profile</h2>
          <p className="sub">Add a photo, your home region, bio and channels. Links are optional and editable any time.</p>
          <div className="card card-pad">
            <div className="field">
              <label>Profile photo</label>
              <div className="row" style={{ gap: 14 }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="preview" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid #fff", boxShadow: "var(--shadow)" }} />
                  : avatarKey
                    ? <img src={mediaUrl(avatarKey)} alt="avatar" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
                    : <Avatar name={pName || "V"} size={72} />}
                <button type="button" className="btn btn-ghost" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? "Uploading…" : "Upload photo"}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
              </div>
            </div>
            <div className="field">
              <label>Name</label>
              <input className="input" value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="field">
              <label>Short bio</label>
              <textarea className="textarea" value={pBio} onChange={(e) => setPBio(e.target.value)} placeholder="What water causes do you work on?" />
            </div>
            <div className="field">
              <label>Home region <span className="tag">(where you belong)</span></label>
              <RegionSelect value={home} onChange={setHome} />
            </div>
            <div className="field">
              <label>Instagram <span className="tag">(optional)</span></label>
              <input className="input" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/yourhandle" />
            </div>
            <div className="field">
              <label>YouTube <span className="tag">(optional)</span></label>
              <input className="input" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@yourchannel" />
            </div>
            <div className="field">
              <label>Other links <span className="tag">(optional)</span></label>
              {links.map((l, i) => (
                <div className="row" key={i} style={{ gap: 8, marginBottom: 8 }}>
                  <input className="input" style={{ flex: "0 0 32%" }} value={l.label} onChange={(e) => updateLink(i, "label", e.target.value)} placeholder="Label" />
                  <input className="input" style={{ flex: 1 }} value={l.url} onChange={(e) => updateLink(i, "url", e.target.value)} placeholder="https://..." />
                  <button type="button" className="btn btn-ghost" onClick={() => removeLink(i)} aria-label="Remove">×</button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" onClick={addLink}>+ Add a link</button>
            </div>
            {error && <ErrorState message={error} />}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={saveProfile}>
              {busy ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ---------- Signup / signin / confirm ----------
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 480 }}>
        <h2>{mode === "signup" ? "Create an account" : mode === "confirm" ? "Verify your email" : "Sign in"}</h2>
        <p className="sub">
          {mode === "signup"
            ? "Join as a volunteer or cleaner. Citizens don't need an account to report."
            : "Sign in as a volunteer, cleaner, or authority. Citizens don't need an account to report."}
        </p>

        <div className="card card-pad">
          {mode === "confirm" ? (
            <>
              <p className="muted">We emailed a 6-digit verification code (OTP) to <strong>{email}</strong>. Enter it to activate your account.</p>
              <div className="field">
                <label>Verification code (OTP)</label>
                <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" />
              </div>
              {error && <ErrorState message={error} />}
              {notice && <div className="state state-empty">{notice}</div>}
              {/* After OTP verify, auto sign-in then go straight to profile setup. */}
              <button className="btn btn-primary btn-block" disabled={busy}
                onClick={() => run(
                  async () => { await confirm(email, code, role); await signIn(email, password); },
                  () => { setMode("setup"); setNotice(null); }
                )}>
                {busy ? "Verifying..." : "Verify & continue"}
              </button>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} disabled={busy}
                onClick={() => run(() => resend(email), () => setNotice("Code resent."))}>
                Resend code
              </button>
            </>
          ) : (
            <>
              {mode === "signup" && (
                <div className="field">
                  <label>I want to join as</label>
                  <div className="chips">
                    <button className={`chip ${role === "volunteer" ? "selected" : ""}`} onClick={() => setRole("volunteer")}>
                      <span className="emoji">📣</span> Volunteer<br /><span className="tag">organize events</span>
                    </button>
                    <button className={`chip ${role === "cleaner" ? "selected" : ""}`} onClick={() => setRole("cleaner")}>
                      <span className="emoji">🧹</span> Cleaner<br /><span className="tag">clean &amp; earn</span>
                    </button>
                  </div>
                  <p className="tag" style={{ marginTop: 8 }}>Authority accounts are issued by administrators — sign in only.</p>
                </div>
              )}
              <div className="field">
                <label>Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="field">
                <label>Password</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 chars, mixed case + number" />
              </div>
              {error && <ErrorState message={error} />}
              {notice && <div className="state state-empty">{notice}</div>}

              {mode === "signup" ? (
                <button className="btn btn-primary btn-block" disabled={busy || !cognitoReady}
                  onClick={() => run(() => signUp(email, password, role), () => { setMode("confirm"); setNotice("Account created. Check your email for the OTP code."); })}>
                  {busy ? "Creating..." : "Create account"}
                </button>
              ) : (
                <button className="btn btn-primary btn-block" disabled={busy || !cognitoReady}
                  onClick={() => run(() => signIn(email, password), () => navigate(nextPath || "/region"))}>
                  {busy ? "Signing in..." : "Sign in"}
                </button>
              )}
              {!cognitoReady && (
                <p className="tag" style={{ marginTop: 10, textAlign: "center" }}>
                  Real email OTP signup/login activates when the app is deployed.
                </p>
              )}
            </>
          )}
        </div>

        {mode !== "confirm" && (
          <p className="muted" style={{ textAlign: "center", marginTop: 14 }}>
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <a onClick={() => { setError(null); setMode(mode === "signup" ? "signin" : "signup"); }} style={{ cursor: "pointer" }}>
              {mode === "signup" ? "Sign in" : "Create an account"}
            </a>
          </p>
        )}

        {/* LOCAL-DEV ONLY: demo roles before AWS deploy. Not in production builds. */}
        {import.meta.env.DEV && !cognitoReady && (
          <div className="card card-pad" style={{ marginTop: 18, borderStyle: "dashed" }}>
            <strong style={{ color: "var(--muted)" }}>Local dev login</strong>
            <p className="tag" style={{ margin: "4px 0 10px" }}>
              Simulates a signed-in user so you can test role features without AWS (no OTP locally). Removed in production.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => { setDevRole("volunteer"); setMode("setup"); }}>Dev: Volunteer</button>
              <button className="btn btn-ghost" onClick={() => { setDevRole("cleaner"); setMode("setup"); }}>Dev: Cleaner</button>
              <button className="btn btn-ghost" onClick={() => { setDevRole("authority"); navigate("/authority"); }}>Dev: Authority</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
