// Cognito auth via amazon-cognito-identity-js (programmatic, so we control UX).
// Config comes from build-time env (set from SAM outputs). If unconfigured,
// isCognitoConfigured() is false and the app shows a dev-only fallback.
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";

const POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;

export function isCognitoConfigured(): boolean {
  return Boolean(POOL_ID && CLIENT_ID);
}

function pool(): CognitoUserPool {
  if (!isCognitoConfigured()) throw new Error("Cognito is not configured for this build.");
  return new CognitoUserPool({ UserPoolId: POOL_ID!, ClientId: CLIENT_ID! });
}

export type SignupRole = "volunteer" | "cleaner";

export interface Session {
  token: string;        // id token (JWT, carries cognito:groups)
  email: string;
  groups: string[];
}

function groupsFromSession(session: CognitoUserSession): string[] {
  const payload = session.getIdToken().decodePayload() as Record<string, unknown>;
  const g = payload["cognito:groups"];
  return Array.isArray(g) ? (g as string[]) : [];
}

// Sign up. The chosen role is passed as clientMetadata so the post-confirmation
// Lambda assigns the correct group (volunteer | cleaner only).
export function signUp(email: string, password: string, role: SignupRole): Promise<void> {
  return new Promise((resolve, reject) => {
    const attrs = [new CognitoUserAttribute({ Name: "email", Value: email })];
    pool().signUp(email, password, attrs, [], (err) => (err ? reject(err) : resolve()), { role });
  });
}

// Pass the chosen role as clientMetadata on CONFIRM (ConfirmSignUp delivers
// clientMetadata to the PostConfirmation trigger; signUp's metadata does not).
export function confirmSignUp(email: string, code: string, role?: SignupRole): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool() });
    const meta = role ? { role } : undefined;
    user.confirmRegistration(code, true, (err) => (err ? reject(err) : resolve()), meta);
  });
}

export function resendCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool() });
    user.resendConfirmationCode((err) => (err ? reject(err) : resolve()));
  });
}

export function signIn(email: string, password: string): Promise<Session> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool() });
    const details = new AuthenticationDetails({ Username: email, Password: password });
    user.authenticateUser(details, {
      onSuccess: (session) => {
        resolve({
          token: session.getIdToken().getJwtToken(),
          email,
          groups: groupsFromSession(session),
        });
      },
      onFailure: (err) => reject(err),
    });
  });
}

// Restore a session on page load (refresh token stored by the SDK in localStorage).
export function restoreSession(): Promise<Session | null> {
  return new Promise((resolve) => {
    if (!isCognitoConfigured()) return resolve(null);
    const user = pool().getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) return resolve(null);
      const email = (user as unknown as { username: string }).username;
      resolve({ token: session.getIdToken().getJwtToken(), email, groups: groupsFromSession(session) });
    });
  });
}

export function signOutCognito(): void {
  if (!isCognitoConfigured()) return;
  const user = pool().getCurrentUser();
  user?.signOut();
}
