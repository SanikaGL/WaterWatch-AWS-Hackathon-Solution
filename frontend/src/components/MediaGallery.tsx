import { mediaUrl } from "../api/media";

export function MediaGallery({ media }: { media: { key: string; type: "image" | "video" }[] }) {
  if (!media || media.length === 0) return null;
  return (
    <div className="row" style={{ marginTop: 8 }}>
      {media.map((m) =>
        m.type === "image" ? (
          <img key={m.key} src={mediaUrl(m.key)} alt="evidence"
            style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} />
        ) : (
          <video key={m.key} src={mediaUrl(m.key)} controls
            style={{ width: 140, borderRadius: 10, border: "1px solid var(--line)" }} />
        )
      )}
    </div>
  );
}
