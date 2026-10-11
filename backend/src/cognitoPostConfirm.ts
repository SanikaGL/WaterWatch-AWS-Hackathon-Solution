// Cognito post-confirmation trigger: assign the user to the group they chose at
// signup (volunteer | cleaner). 'authority' is NEVER self-assignable here — it is
// granted out of band by an admin. The chosen role arrives in a custom client
// metadata attribute 'role' (validated against an allowlist).
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({});
const SELF_ASSIGNABLE = new Set(["volunteer", "cleaner"]);

interface PostConfirmEvent {
  userPoolId: string;
  userName: string;
  request: {
    userAttributes: Record<string, string>;
    clientMetadata?: Record<string, string>;
  };
}

export const handler = async (event: PostConfirmEvent) => {
  const requested =
    event.request.clientMetadata?.role ||
    event.request.userAttributes["custom:role"] ||
    "volunteer";

  const group = SELF_ASSIGNABLE.has(requested) ? requested : "volunteer";

  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      GroupName: group,
    })
  );

  return event; // Cognito triggers must return the event
};
