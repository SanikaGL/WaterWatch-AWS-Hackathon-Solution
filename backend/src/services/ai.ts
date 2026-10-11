// Bedrock-backed AI with a deterministic local fallback so demos never hard-fail.
// Enforces the rule: NEVER accuse or name an individual.
import { config } from "../domain/config.js";

export interface AwarenessPostInput {
  waterBodyName: string;
  talukName: string;
  districtName: string;
  stateName?: string;
  exactLocation?: string;
  reportCount: number;
  windowDays: number;
  issueType: "POLLUTION" | "LEAKAGE" | "HAZARD";
  monthly?: boolean;      // monthly "highest pollution in region" framing
  periodLabel?: string;   // e.g. "September 2026"
}

export interface AwarenessPost {
  title: string;
  content: string;
  source: "bedrock" | "fallback";
}

function issueWord(t: AwarenessPostInput["issueType"]) {
  return t === "POLLUTION" ? "water-pollution" : t === "LEAKAGE" ? "water-leakage" : "water-safety";
}

// Full "Taluk, District, State" + exact spot for the body copy.
function placeString(i: AwarenessPostInput): string {
  const region = [i.talukName, i.districtName, i.stateName].filter(Boolean).join(", ");
  return i.exactLocation ? `${i.exactLocation} (${region})` : `${i.waterBodyName}, ${region}`;
}

// Deterministic fallback copy. Environmental problem + location + evidence only.
// Never names or accuses an individual.
function fallbackPost(i: AwarenessPostInput): AwarenessPost {
  const place = placeString(i);
  const tag = `#WaterWatch #${i.talukName.replace(/\s+/g, "")} #WaterSafety`;

  if (i.monthly) {
    return {
      title: `${i.periodLabel ?? "This month"}: ${i.waterBodyName} is the most-polluted water body in ${i.talukName}`,
      content:
        `This month, ${i.waterBodyName} recorded the highest number of water-pollution reports in ` +
        `${i.talukName}, ${i.districtName}${i.stateName ? `, ${i.stateName}` : ""} — ` +
        `${i.reportCount} community reports concentrated at ${place}. ` +
        `The evidence below was submitted by residents. If you live nearby, please avoid using this water, ` +
        `report any new pollution, and join a verified cleanup. Together we can bring it back. ${tag}`,
      source: "fallback",
    };
  }

  const word = issueWord(i.issueType);
  return {
    title: `Recurring ${i.issueType === "POLLUTION" ? "Water Pollution" : i.issueType === "LEAKAGE" ? "Water Leakage" : "Water Safety"} Concern — ${i.waterBodyName}`,
    content:
      `${i.reportCount} independent community reports have been recorded at ${place} ` +
      `during the past ${i.windowDays} days, indicating a recurring ${word} concern. ` +
      `Community members are encouraged to report further evidence and take part in verified ` +
      `cleanup activities. Protect the water around us. ${tag}`,
    source: "fallback",
  };
}

// Guard: strip any accusatory phrasing just in case the model misbehaves.
function sanitize(text: string): string {
  return text
    .replace(/\b(blame|accus\w+|culprit|responsible person|guilty)\b/gi, "concern")
    .trim();
}

export async function generateAwarenessPost(input: AwarenessPostInput): Promise<AwarenessPost> {
  // Keep local/dev fast and reliable unless Bedrock is explicitly enabled.
  if (process.env.BEDROCK_ENABLED !== "true") {
    return fallbackPost(input);
  }
  try {
    // Lazy import so local dev without AWS creds doesn't fail on module load.
    const { BedrockRuntimeClient, InvokeModelCommand } = await import(
      "@aws-sdk/client-bedrock-runtime"
    );
    const client = new BedrockRuntimeClient({ region: config.AWS_REGION });
    const framing = input.monthly
      ? `This is a MONTHLY community alert highlighting the single most-polluted water body in a region.`
      : `This is a recurring-issue awareness alert for one water body.`;
    const prompt =
      `You write short public water-safety awareness posts for a civic website. ` +
      `${framing} ` +
      `Rules: NEVER accuse, name, or identify any individual, group, business, or caste/community. ` +
      `Report only the environmental problem, the exact location, and the evidence (report counts). ` +
      `Tone: factual, respectful, motivating people to act. 50-80 words, end with 3 hashtags.\n\n` +
      `Facts: ${input.reportCount} independent reports of ${issueWord(input.issueType)} ` +
      `at ${placeString(input)} ` +
      `${input.monthly ? `during ${input.periodLabel ?? "this month"}` : `in the last ${input.windowDays} days`}. ` +
      `Photo/video proof from residents is attached below the post.`;

    const body = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 300,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    };
    const res = await client.send(
      new InvokeModelCommand({
        modelId: config.BEDROCK_MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(body),
      })
    );
    const decoded = JSON.parse(new TextDecoder().decode(res.body));
    const text: string = decoded?.content?.[0]?.text ?? "";
    if (!text) return fallbackPost(input);
    const fb = fallbackPost(input);
    return { title: fb.title, content: sanitize(text), source: "bedrock" };
  } catch {
    return fallbackPost(input);
  }
}
