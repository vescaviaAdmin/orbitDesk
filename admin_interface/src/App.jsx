import { useEffect, useState } from "react";
import AuthComplete from "./pages/AuthComplete";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import GetStarted from "./pages/GetStarted";
import SetPassword from "./pages/SetPassword";

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    function handleRouteChange() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  if (path.startsWith("/set-password")) {
    return <SetPassword />;
  }

  if (path.startsWith("/get-started")) {
    return <GetStarted />;
  }

  if (path.startsWith("/login")) {
    return <AdminLogin />;
  }

  if (path.startsWith("/auth-complete")) {
    return <AuthComplete />;
  }

  return <AdminDashboard />;
}

export default App;
