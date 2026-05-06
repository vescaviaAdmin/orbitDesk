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
    <main className="grid min-h-screen place-items-center bg-[#f7f8fb] px-5 text-[#161c24]">
      <div className="rounded-2xl border border-[#d7dee8] bg-white px-6 py-5 text-sm text-[#5b6677] shadow-sm">
        Signing you into the admin workspace...
      </div>
    </main>
  );
}

export default AuthComplete;
