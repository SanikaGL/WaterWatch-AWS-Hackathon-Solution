// Verifies the presign -> PUT bytes -> GET bytes round-trip against the local stub.
export {};
const BASE = process.env.BASE || "http://localhost:4000";

async function main() {
  // 1x1 PNG
  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const bytes = Buffer.from(pngBase64, "base64");

  const presign = await (await fetch(`${BASE}/media/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "reports", contentType: "image/png" }),
  })).json();
  console.log("presign key:", presign.key, "simulated:", presign.simulated);

  const put = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: bytes,
  });
  console.log("PUT status:", put.status);

  const get = await fetch(presign.uploadUrl);
  const got = Buffer.from(await get.arrayBuffer());
  console.log("GET status:", get.status, "content-type:", get.headers.get("content-type"));
  console.log("bytes match:", got.equals(bytes));

  if (put.status !== 200 || get.status !== 200 || !got.equals(bytes)) {
    console.error("UPLOAD SMOKE FAILED");
    process.exit(1);
  }
  console.log("UPLOAD SMOKE OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
