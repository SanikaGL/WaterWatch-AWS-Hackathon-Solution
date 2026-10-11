// Reusable media uploader: requests a presigned URL, PUTs the file to S3
// (or the local stub), and reports back the stored object key + preview URL.
import { useRef, useState } from "react";
import { api } from "../api/client";

export interface UploadedMedia {
  key: string;
  type: "image" | "video";
  previewUrl: string; // local object URL for preview
}

interface PresignResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  simulated: boolean;
}

const ACCEPT = "image/jpeg,image/png,image/webp,video/mp4";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export function MediaUpload({
  prefix = "reports",
  onChange,
}: {
  prefix?: string;
  onChange: (media: UploadedMedia[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadedMedia[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const next: UploadedMedia[] = [...items];
      for (const file of Array.from(files)) {
        if (file.size > MAX_BYTES) {
          setError(`${file.name} is larger than 8 MB.`);
          continue;
        }
        const presign = await api.post<PresignResponse>("/media/presign", {
          prefix,
          contentType: file.type,
        });
        // Upload the bytes with a plain PUT (works for S3 presigned + local stub).
        const put = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!put.ok) throw new Error(`Upload failed (${put.status})`);
        next.push({
          key: presign.key,
          type: file.type.startsWith("video") ? "video" : "image",
          previewUrl: URL.createObjectURL(file),
        });
      }
      setItems(next);
      onChange(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(key: string) {
    const next = items.filter((i) => i.key !== key);
    setItems(next);
    onChange(next);
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Uploading..." : "📷 Add photo / video"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="tag" style={{ color: "var(--alert)", marginTop: 8 }}>{error}</p>}
      {items.length > 0 && (
        <div className="row" style={{ marginTop: 10 }}>
          {items.map((m) => (
            <div key={m.key} style={{ position: "relative" }}>
              {m.type === "image" ? (
                <img src={m.previewUrl} alt="upload preview"
                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: 10, border: "1px solid var(--line)", display: "grid", placeItems: "center", background: "#eef5f7" }}>🎥</div>
              )}
              <button type="button" onClick={() => remove(m.key)}
                aria-label="Remove"
                style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", border: "none", background: "var(--alert)", color: "#fff", cursor: "pointer", lineHeight: 1 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
