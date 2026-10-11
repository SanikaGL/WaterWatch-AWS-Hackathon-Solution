// Auth context. Real Cognito session when configured; local dev role fallback
// (dev builds only) so authority features are demoable without AWS.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAuthProvider, api } from "../api/client";
import * as cognito from "../api/cognito";

// Ensure a stub community profile exists so a volunteer/cleaner shows up in the
// list right after signing in (even before they complete profile setup).
// Returns the resolved display name: the saved profile name once set up, else undefined
// (callers fall back to the email handle).
async function ensureRegistered(token: string, sub: string | undefined, groups: string[]): Promise<string | undefined> {
  setAuthProvider(() => ({ token }));
  try {
    if (groups.includes("volunteer") || groups.includes("cleaner")) {
      const reg = await api.post<{ volunteer: { name: string; profileComplete?: boolean } }>("/me/register");
      if (reg.volunteer?.profileComplete && reg.volunteer.name) return reg.volunteer.name;
      return undefined;
    }
    if (groups.includes("authority") && sub) {
      const me = await api.get<{ authority: { name: string } }>("/authority/me");
      return me.authority?.name;
    }
  } catch { /* non-fatal */ }
  return undefined;
}

export type Role = "volunteer" | "cleaner" | "authority";

interface AuthContextValue {
  token?: string;
  email?: string;
  sub?: string;        // identity id: Cognito sub, or "dev-user" in dev role
  profileName?: string; // saved community/authority profile name (preferred display)
  groups: Role[];
  devRole: Role | null;
  loading: boolean;
  cognitoReady: boolean;
  signedIn: boolean;
  isAuthority: boolean;
  isCleaner: boolean;
  isVolunteer: boolean;
  // Real Cognito
  signUp: (email: string, password: string, role: "volunteer" | "cleaner") => Promise<void>;
  confirm: (email: string, code: string, role?: "volunteer" | "cleaner") => Promise<void>;
  resend: (email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  // Local dev bridge
  setDevRole: (r: Role | null) => void;
  signOut: () => void;
  // Called after saving a profile so the nav/display name updates immediately.
  refreshProfileName: (name: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const DEV_KEY = "waterwatch.devRole";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | undefined>();
  const [email, setEmail] = useState<string | undefined>();
  const [groups, setGroups] = useState<Role[]>([]);
  const [profileName, setProfileName] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [devRole, setDevRoleState] = useState<Role | null>(() => {
    const raw = localStorage.getItem(DEV_KEY);
    return raw ? (raw as Role) : null;
  });

  const cognitoReady = cognito.isCognitoConfigured();

  // Feed the API client. Real token wins; else fall back to dev role.
  useEffect(() => {
    setAuthProvider(() => {
      if (token) return { token };
      if (devRole) return { devGroups: [devRole] };
      return {};
    });
  }, [token, devRole]);

  // Restore Cognito session on load.
  useEffect(() => {
    let active = true;
    cognito.restoreSession()
      .then(async (s) => {
        if (active && s) {
          setToken(s.token); setEmail(s.email); setGroups(s.groups as Role[]);
          const name = await ensureRegistered(s.token, subFromToken(s.token), s.groups);
          if (active && name) setProfileName(name);
        }
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (devRole) localStorage.setItem(DEV_KEY, devRole);
    else localStorage.removeItem(DEV_KEY);
  }, [devRole]);

  // Decode the Cognito sub from the id token (for profile ownership checks).
  function subFromToken(t?: string): string | undefined {
    if (!t) return undefined;
    try {
      const payload = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return payload.sub as string | undefined;
    } catch { return undefined; }
  }

  const value = useMemo<AuthContextValue>(() => {
    const effectiveGroups: Role[] = token ? groups : devRole ? [devRole] : [];
    const sub = token ? subFromToken(token) : devRole ? "dev-user" : undefined;
    return {
      token, email, sub, profileName, groups, devRole, loading, cognitoReady,
      signedIn: Boolean(token) || Boolean(devRole),
      isAuthority: effectiveGroups.includes("authority"),
      isCleaner: effectiveGroups.includes("cleaner"),
      isVolunteer: effectiveGroups.includes("volunteer"),
      signUp: (e, p, r) => cognito.signUp(e, p, r),
      confirm: (e, c, r) => cognito.confirmSignUp(e, c, r),
      resend: (e) => cognito.resendCode(e),
      signIn: async (e, p) => {
        const s = await cognito.signIn(e, p);
        setToken(s.token); setEmail(s.email); setGroups(s.groups as Role[]);
        const name = await ensureRegistered(s.token, subFromToken(s.token), s.groups);
        setProfileName(name);
      },
      refreshProfileName: (name: string) => setProfileName(name),
      setDevRole: setDevRoleState,
      signOut: () => {
        cognito.signOutCognito();
        setToken(undefined); setEmail(undefined); setGroups([]); setDevRoleState(null); setProfileName(undefined);
      },
    };
  }, [token, email, profileName, groups, devRole, loading, cognitoReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
