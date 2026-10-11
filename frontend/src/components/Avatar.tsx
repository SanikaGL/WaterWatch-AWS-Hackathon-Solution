import { mediaUrl } from "../api/media";

const COLORS = ["#0e6a8e", "#1792b8", "#2bb3a3", "#0b4f6c", "#2a8f6a"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "V";
}
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({ name, avatarKey, size = 56 }: { name: string; avatarKey?: string; size?: number }) {
  if (avatarKey) {
    return (
      <img src={mediaUrl(avatarKey)} alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
    );
  }
  return (
    <div aria-hidden style={{
      width: size, height: size, borderRadius: "50%", background: colorFor(name),
      color: "#fff", display: "grid", placeItems: "center",
      fontWeight: 800, fontSize: size * 0.38, border: "2px solid #fff",
      boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
    }}>
      {initials(name)}
    </div>
  );
}
