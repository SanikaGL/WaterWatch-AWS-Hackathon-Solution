// Volunteer awareness post: title (optional) + description + photo/video. Volunteer-only.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { VolunteerPost } from "../types";
import { ErrorState } from "../components/States";
import { MediaUpload, type UploadedMedia } from "../components/MediaUpload";
import { useAuth } from "../context/AuthContext";
import { useRegion } from "../context/RegionContext";

export function CreatePost() {
  const navigate = useNavigate();
  const { isVolunteer, signedIn, loading, sub } = useAuth();
  const { region } = useRegion();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <section className="section"><div className="container" /></section>;

  if (!isVolunteer) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 520 }}>
          <h2>Only volunteers can post</h2>
          <p className="sub">
            {signedIn
              ? "Your account isn't a volunteer account. Awareness posts are a volunteer action."
              : "Awareness posts are a volunteer action. Sign up as a volunteer first — you'll come straight back here."}
          </p>
          <div className="row">
            {!signedIn && (
              <button className="btn btn-ghost btn-lg" onClick={() => navigate("/account?mode=signin&next=/posts/new")}>Sign in</button>
            )}
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/account?mode=signup&role=volunteer&next=/posts/new")}>
              Sign up as Volunteer
            </button>
          </div>
        </div>
      </section>
    );
  }

  async function submit() {
    setError(null);
    if (description.trim().length < 3) { setError("Add a description."); return; }
    setBusy(true);
    try {
      const res = await api.post<{ post: VolunteerPost }>("/posts/awareness", {
        title: title.trim() || undefined,
        description: description.trim(),
        media: media.map((m) => ({ key: m.key, type: m.type })),
        stateId: region?.stateId, districtId: region?.districtId, talukId: region?.talukId,
      });
      void res;
      // Post appears inline on your profile; comments expand there.
      navigate(sub ? `/volunteers/${sub}` : "/volunteers");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 600 }}>
        <h2 className="mb-0">Share an awareness post</h2>
        <p className="sub">Tell the community about a cleanup, a tip, or a water issue. Photos and video welcome.</p>

        <div className="card card-pad">
          <div className="field">
            <label>Title <span className="tag">(optional)</span></label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Belur Lake cleanup recap" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="textarea" style={{ minHeight: 120 }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Share what happened, what you learned, or how others can help." />
          </div>
          <div className="field">
            <label>Photo / video <span className="tag">(optional)</span></label>
            <MediaUpload prefix="posts" onChange={setMedia} />
          </div>
          {error && <ErrorState message={error} />}
          <button className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={submit}>
            {busy ? "Posting…" : "Publish post"}
          </button>
        </div>
      </div>
    </section>
  );
}
