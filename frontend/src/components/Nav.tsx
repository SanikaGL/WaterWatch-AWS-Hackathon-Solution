import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Nav() {
  const { signedIn, isAuthority, isVolunteer, isCleaner, email, sub, profileName, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const go = (path: string) => { close(); navigate(path); };

  const roleLabel = isAuthority ? "Authority" : isVolunteer ? "Volunteer" : isCleaner ? "Cleaner" : "Member";
  // Prefer the saved profile name; fall back to the email handle only until set up.
  const displayName = profileName || (email ? email.split("@")[0] : roleLabel);

  function goMyProfile() {
    close();
    // Volunteers/cleaners have a public profile keyed by their id (sub).
    if (isCleaner && sub) navigate(`/cleaners/${sub}`);
    else if (isVolunteer && sub) navigate(`/volunteers/${sub}`);
    else navigate("/account");
  }

  const links = (
    <>
      <NavLink to="/" end onClick={close}>Home</NavLink>
      <NavLink to="/floods" onClick={close}>Floods</NavLink>
      <NavLink to="/regions" onClick={close}>Regions</NavLink>
      <NavLink to="/report" onClick={close}>Report</NavLink>
      <NavLink to="/volunteers" onClick={close}>Volunteers</NavLink>
      <NavLink to="/cleaners" onClick={close}>Cleaners</NavLink>
      <NavLink to="/authorities" onClick={close}>Authorities</NavLink>
      <NavLink to="/alerts" onClick={close}>Alerts</NavLink>
      <NavLink to="/learn" onClick={close}>Learn</NavLink>
      <NavLink to="/how-it-works" onClick={close}>How it works</NavLink>
      {signedIn && <NavLink to="/messages" onClick={close}>Messages</NavLink>}
      {isAuthority && <NavLink to="/authority" onClick={close}>Dashboard</NavLink>}
    </>
  );

  // The signed-in identity chip: role badge + name, links to the user's profile/account.
  const identity = (
    <button className="identity-chip" onClick={goMyProfile} title="Your profile">
      <span className={`badge ${isAuthority ? "badge-warn" : "badge-ok"}`}>{roleLabel}</span>
      <span className="identity-name">{displayName}</span>
    </button>
  );

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" onClick={close}>
          <span className="brand-dot" /> WaterWatch
        </Link>

        {/* Desktop links */}
        <div className="nav-links">{links}</div>

        {/* Desktop right actions */}
        <div className="nav-right nav-desktop-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/report")}>Report</button>
          {signedIn ? (
            <>
              {identity}
              <button className="btn btn-ghost btn-sm" onClick={signOut} title="Sign out">Sign out</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/account?mode=signin")}>Sign in</button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate("/account?mode=signup")}>Sign up</button>
            </>
          )}
        </div>

        {/* Mobile: compact auth/identity + hamburger (always clear what to do) */}
        <div className="nav-mobile-bar">
          {signedIn ? (
            <button className="identity-chip identity-chip-sm" onClick={goMyProfile} title="Your profile">
              <span className={`badge ${isAuthority ? "badge-warn" : "badge-ok"}`}>{roleLabel}</span>
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/account?mode=signup")}>Sign up</button>
          )}
          <button className="hamburger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <div className="mobile-panel">
          <div className="container">
            <div className="mobile-links">{links}</div>
            <div className="mobile-actions">
              {signedIn && (
                <button className="btn btn-ghost btn-block" onClick={goMyProfile}>
                  {roleLabel}: {displayName} — view profile
                </button>
              )}
              <button className="btn btn-ghost btn-block" onClick={() => go("/regions")}>Browse regions</button>
              <button className="btn btn-primary btn-block" onClick={() => go("/report")}>Report a problem</button>
              {signedIn ? (
                <button className="btn btn-ghost btn-block" onClick={() => { signOut(); close(); }}>Sign out</button>
              ) : (
                <>
                  <button className="btn btn-ghost btn-block" onClick={() => go("/account?mode=signin")}>Sign in</button>
                  <button className="btn btn-primary btn-block" onClick={() => go("/account?mode=signup")}>Sign up</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
