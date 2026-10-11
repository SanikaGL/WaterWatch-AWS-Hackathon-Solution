// Post-deploy admin helper: create a REAL authority login on AWS and bind it to a
// region. Authorities never self-signup — an admin runs this once per authority.
//
// What it does:
//   1. Creates (or reuses) a Cognito user with a permanent password.
//   2. Adds them to the 'authority' group (so the JWT carries cognito:groups).
//   3. Writes an AuthorityProfile DynamoDB record keyed by the user's Cognito sub,
//      bound to the given region — so getAuthority(sub) resolves on login.
//
// Usage (PowerShell), after `sam deploy` gives you the outputs:
//   $env:AWS_REGION="us-east-1"
//   $env:USER_POOL_ID="us-east-1_xxxxxxx"
//   $env:TABLE_NAME="waterwatch-dev"
//   npx tsx src/local/provisionAuthority.ts `
//     --email belur.authority@example.com --password "Water@12345" `
//     --name "Suresh Hegde" --taluk BELUR `
//     --designation "Taluk Water Officer" --department "Minor Irrigation Dept."
//
// Prints the final email + password + region so you can log in and test.
import {
  CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand, AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { REGION_TREE } from "../data/regions.js";

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required --${name}`);
}

function resolveTaluk(talukId: string) {
  for (const s of REGION_TREE)
    for (const d of s.districts)
      for (const t of d.taluks)
        if (t.talukId === talukId)
          return { stateId: s.stateId, districtId: d.districtId, talukId: t.talukId, label: `${t.talukName}, ${d.districtName}, ${s.stateName}` };
  throw new Error(`Unknown talukId "${talukId}". Known taluks: ${REGION_TREE[0].districts[0].taluks.map((t) => t.talukId).join(", ")}`);
}

async function main() {
  const region = process.env.AWS_REGION || "us-east-1";
  const userPoolId = process.env.USER_POOL_ID;
  const tableName = process.env.TABLE_NAME;
  if (!userPoolId) throw new Error("Set USER_POOL_ID (from sam deploy outputs).");
  if (!tableName) throw new Error("Set TABLE_NAME (e.g. waterwatch-dev).");

  const email = arg("email");
  const password = arg("password");
  const name = arg("name");
  const talukId = arg("taluk");
  const designation = arg("designation", "Taluk Water Officer");
  const department = arg("department", "Minor Irrigation Dept.");
  const reg = resolveTaluk(talukId);

  const idp = new CognitoIdentityProviderClient({ region });

  // 1) Create the user (idempotent-ish: ignore "already exists").
  try {
    await idp.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      MessageAction: "SUPPRESS", // we set the password ourselves; no invite email
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
      ],
    }));
    console.log(`Created Cognito user ${email}`);
  } catch (e: any) {
    if (e?.name === "UsernameExistsException") console.log(`User ${email} already exists — continuing.`);
    else throw e;
  }

  // 2) Permanent password + add to 'authority' group.
  await idp.send(new AdminSetUserPasswordCommand({ UserPoolId: userPoolId, Username: email, Password: password, Permanent: true }));
  await idp.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: email, GroupName: "authority" }));

  // 3) Resolve the user's Cognito sub (that's the authorityId the app keys on).
  const got = await idp.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: email }));
  const sub = got.UserAttributes?.find((a) => a.Name === "sub")?.Value;
  if (!sub) throw new Error("Could not read the user's sub.");

  // 4) Write the AuthorityProfile DB record keyed by sub, bound to the region.
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), { marshallOptions: { removeUndefinedValues: true } });
  const now = new Date().toISOString();
  await ddb.send(new PutCommand({
    TableName: tableName,
    Item: {
      PK: `AUTH#${sub}`, SK: "PROFILE",
      GSI1PK: "AUTH#ALL", GSI1SK: `PROFILE#${name.toLowerCase()}#${sub}`,
      entity: "AUTHORITY_PROFILE",
      authorityId: sub, name, designation, department,
      bio: `Responsible for water bodies and flood response across ${reg.label}.`,
      email, stateId: reg.stateId, districtId: reg.districtId, talukId: reg.talukId,
      createdAt: now,
    },
  }));

  console.log("\n==================  AUTHORITY LOGIN READY  ==================");
  console.log(`  Email    : ${email}`);
  console.log(`  Password : ${password}`);
  console.log(`  Region   : ${reg.label}`);
  console.log(`  Sub/ID   : ${sub}`);
  console.log("  Sign in at the deployed site -> Account -> Sign in.");
  console.log("=============================================================\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
