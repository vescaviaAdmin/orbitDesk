import { useEffect } from "react";
import { setAdminSession } from "../api/admin";

function routeTo(path) {
  window.history.replaceState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function AuthComplete() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serializedSession = params.get("session") || "";

    if (!serializedSession) {
      routeTo("/login");
      return;
    }

    try {
      const session = JSON.parse(serializedSession);
      setAdminSession(session);
      routeTo(session.redirectTo || "/");
    } catch {
      routeTo("/login");
    }
  }, []);

  return (
    <main className="app-shell grid place-items-center">
      <div className="neo-panel px-6 py-5 text-sm text-[color:var(--text-muted)]">
        Signing you into the admin workspace...
      </div>
    </main>
  );
}

export default AuthComplete;
