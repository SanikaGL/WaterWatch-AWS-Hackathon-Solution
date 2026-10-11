// Configurable values. In AWS these come from SSM Parameter Store / env vars.
// Locally they default here. NEVER hard-code secrets (IG token etc.) in source.

export const config = {
  // Recurring-issue detection
  REPORT_THRESHOLD: Number(process.env.REPORT_THRESHOLD ?? 5),
  TIME_WINDOW_DAYS: Number(process.env.TIME_WINDOW_DAYS ?? 30),

  // Monthly pollution alert: minimum pollution reports for a region's worst water
  // body to qualify for a monthly awareness alert (configurable, not hard-coded).
  MONTHLY_POLLUTION_MIN: Number(process.env.MONTHLY_POLLUTION_MIN ?? 3),

  // Reward (configurable, not a promise)
  REWARD_AMOUNT: Number(process.env.REWARD_AMOUNT ?? 500),
  REWARD_CURRENCY: process.env.REWARD_CURRENCY ?? "INR",

  // Infra
  TABLE_NAME: process.env.TABLE_NAME ?? "waterwatch-local",
  MEDIA_BUCKET: process.env.MEDIA_BUCKET ?? "waterwatch-media-local",
  AWS_REGION: process.env.AWS_REGION ?? "us-east-1",

  // Bedrock
  BEDROCK_MODEL_ID:
    process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-3-haiku-20240307-v1:0",

  // Local dev flags
  IS_LOCAL: process.env.IS_LOCAL === "true",
  DDB_ENDPOINT: process.env.DDB_ENDPOINT ?? "", // e.g. http://localhost:8000 locally
};
