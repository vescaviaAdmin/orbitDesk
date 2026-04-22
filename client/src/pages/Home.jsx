import { useEffect, useState } from "react";
import Hero from "../components/Hero";
import SignupPage from "./SignupPage";
import SetPasswordPage from "./SetPasswordPage";
import LoginPage from "./LoginPage";
import OtpVerifyPage from "./OtpVerifyPage";
import WelcomePage from "./WelcomePage";
import { fetchHealth } from "../config/api";

function getInitialMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") || "signup";
}

function Home() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("orbitdesk-theme") || "dark";
  });
  const [mode, setMode] = useState(getInitialMode);
  const [apiMessage, setApiMessage] = useState("Loading...");
  const [signupSubmission, setSignupSubmission] = useState(null);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loggedInUser, setLoggedInUser] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const setupToken = params.get("token") || "";
  const setupEmail = params.get("email") || "";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("orbitdesk-theme", theme);
  }, [theme]);

  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await fetchHealth();
        setApiMessage(data.status || "Connected");
      } catch (loadError) {
        setApiMessage("Server not reachable");
      }
    }

    loadHealth();
  }, []);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  function navigate(nextMode) {
    const nextUrl = new URL(window.location.href);

    if (nextMode === "signup") {
      nextUrl.search = "";
    } else {
      nextUrl.searchParams.set("mode", nextMode);
      if (nextMode !== "set-password") {
        nextUrl.searchParams.delete("token");
        nextUrl.searchParams.delete("email");
      }
    }

    window.history.replaceState({}, "", nextUrl);
    setMode(nextMode);
  }

  function renderPage() {
    if (mode === "set-password") {
      return (
        <SetPasswordPage
          initialEmail={setupEmail}
          initialToken={setupToken}
          onPasswordSet={(email) => {
            setLoginIdentifier(email);
            navigate("login");
          }}
        />
      );
    }

    if (mode === "login") {
      return (
        <LoginPage
          defaultIdentifier={loginIdentifier}
          onOtpRequested={(identifier, email) => {
            setLoginIdentifier(identifier);
            setLoginEmail(email);
            navigate("verify-otp");
          }}
        />
      );
    }

    if (mode === "verify-otp") {
      return (
        <OtpVerifyPage
          identifier={loginIdentifier}
          email={loginEmail}
          onVerified={(user) => {
            setLoggedInUser(user);
            navigate("welcome");
          }}
        />
      );
    }

    if (mode === "welcome" && loggedInUser) {
      return (
        <WelcomePage
          user={loggedInUser}
          onLogout={() => {
            setLoggedInUser(null);
            setLoginIdentifier("");
            setLoginEmail("");
            navigate("login");
          }}
        />
      );
    }

    return (
      <SignupPage
        submission={signupSubmission}
        onSignedUp={(data) => {
          setSignupSubmission(data);
        }}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10">
      <Hero apiMessage={apiMessage} theme={theme} onToggleTheme={toggleTheme} />

      <div className="mt-6 flex flex-wrap gap-3">
        {[
          ["signup", "Signup"],
          ["set-password", "Set Password"],
          ["login", "Login"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate(key)}
            className="rounded-full border px-4 py-2 text-sm font-semibold transition"
            style={{
              borderColor:
                mode === key ? "var(--border-strong)" : "var(--border-soft)",
              backgroundColor: mode === key ? "var(--bg-soft)" : "var(--bg-panel)",
              color: "var(--text-primary)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {renderPage()}
    </main>
  );
}

export default Home;
