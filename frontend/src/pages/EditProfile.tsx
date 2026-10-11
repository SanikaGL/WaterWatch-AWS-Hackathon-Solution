// Volunteer self-edit: avatar photo, bio, Instagram, YouTube, + any extra links.
// Saves via POST /volunteers/me (backend uses the auth identity). Volunteer-only.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { mediaUrl } from "../api/media";
import type { ProfileLink, VolunteerProfile } from "../types";
import { ErrorState, Loading } from "../components/States";
import { Avatar } from "../components/Avatar";
import { RegionSelect, type RegionValue } from "../components/RegionSelect";
import { useAuth } from "../context/AuthContext";

interface PresignResponse { uploadUrl: string; key: string; }

export function EditProfile() {
  const navigate = useNavigate();
  const { isVolunteer, isCleaner, loading, email, refreshProfileName } = useAuth();
  const canEdit = isVolunteer || isCleaner;
  const editRole: "volunteer" | "cleaner" = isCleaner ? "cleaner" : "volunteer";

  const fileRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarKey, setAvatarKey] = useState<string | undefined>();
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [home, setHome] = useState<RegionValue>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from existing profile (if the user already has one).
  useEffect(() => {
    if (!canEdit) { setLoaded(true); return; }
    // We don't know our own id (Cognito sub) client-side easily, so just
    // start blank/prefill from email; a POST merges server-side with existing.
    setName((prev) => prev || (email ? email.split("@")[0] : ""));
    setLoaded(true);
  }, [canEdit, email]);

  if (loading || !loaded) return <section className="section"><div className="container"><Loading /></div></section>;

  if (!canEdit) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 520 }}>
          <h2>Create your community profile</h2>
          <p className="sub">Sign up as a volunteer or cleaner to build a public community profile.</p>
          <div className="row">
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/account?mode=signup&role=volunteer")}>Become a Volunteer</button>
            <button className="btn btn-ghost btn-lg" onClick={() => navigate("/account?mode=signup&role=cleaner")}>Become a Cleaner</button>
          </div>
        </div>
      </section>
    );
  }

  async function uploadAvatar(file: File) {
    setError(null);
    if (file.size > 5 * 1024 * 1024) { setError("Photo must be under 5 MB."); return; }
    setUploadingAvatar(true);
    try {
      const presign = await api.post<PresignResponse>("/media/presign", { prefix: "avatars", contentType: file.type });
      const put = await fetch(presign.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      setAvatarKey(presign.key);
      setAvatarPreview(URL.createObjectURL(file));
    } catch (e) { setError((e as Error).message); }
    finally { setUploadingAvatar(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  function addLink() { setLinks((l) => [...l, { label: "", url: "" }]); }
  function updateLink(i: number, field: keyof ProfileLink, val: string) {
    setLinks((l) => l.map((x, idx) => (idx === i ? { ...x, [field]: val } : x)));
  }
  function removeLink(i: number) { setLinks((l) => l.filter((_, idx) => idx !== i)); }

  async function save() {
    setError(null);
    if (name.trim().length < 2) { setError("Add your name."); return; }
    setBusy(true);
    try {
      const payload: Partial<VolunteerProfile> = {
        name: name.trim(),
        bio: bio.trim(),
        instagram: instagram.trim() || undefined,
        youtube: youtube.trim() || undefined,
        links: links.filter((l) => l.label.trim() && l.url.trim()),
        homeStateId: home.homeStateId,
        homeDistrictId: home.homeDistrictId,
        homeTalukId: home.homeTalukId,
      };
      if (avatarKey) (payload as Record<string, unknown>).avatarKey = avatarKey;
      const endpoint = editRole === "cleaner" ? "/cleaners/me" : "/volunteers/me";
      const base = editRole === "cleaner" ? "cleaners" : "volunteers";
      const res = await api.post<{ volunteer: VolunteerProfile }>(endpoint, payload);
      refreshProfileName(name.trim()); // update nav/display name immediately
      navigate(`/${base}/${res.volunteer.volunteerId}`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 600 }}>
        <h2 className="mb-0">Edit your {editRole} profile</h2>
        <p className="sub">Your public community profile. Links are optional — add them any time.</p>

        <div className="card card-pad">
          {/* Avatar */}
          <div className="field">
            <label>Profile photo</label>
            <div className="row" style={{ gap: 14 }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="preview" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid #fff", boxShadow: "var(--shadow)" }} />
                : avatarKey
                  ? <img src={mediaUrl(avatarKey)} alt="avatar" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
                  : <Avatar name={name || "V"} size={72} />}
              <button type="button" className="btn btn-ghost" disabled={uploadingAvatar} onClick={() => fileRef.current?.click()}>
                {uploadingAvatar ? "Uploading..." : "Upload photo"}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            </div>
          </div>

          <div className="field">
            <label>Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>

          <div className="field">
            <label>Short bio</label>
            <textarea className="textarea" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What water causes do you work on?" />
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
                <input className="input" style={{ flex: "0 0 32%" }} value={l.label} onChange={(e) => updateLink(i, "label", e.target.value)} placeholder="Label (e.g. Facebook)" />
                <input className="input" style={{ flex: 1 }} value={l.url} onChange={(e) => updateLink(i, "url", e.target.value)} placeholder="https://..." />
                <button type="button" className="btn btn-ghost" onClick={() => removeLink(i)} aria-label="Remove">×</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost" onClick={addLink}>+ Add a link</button>
          </div>

          {error && <ErrorState message={error} />}
          <button className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={save}>
            {busy ? "Saving..." : "Save profile"}
          </button>
        </div>
      </div>
    </section>
  );
}
