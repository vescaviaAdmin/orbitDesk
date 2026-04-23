import { useEffect, useState } from "react";
import Login from "./pages/Login";
import ClientDashboard from "./pages/client/ClientDashboard";
import MemberDashboard from "./pages/member/MemberDashboard";

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    function handleRouteChange() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  if (path.startsWith("/client/dashboard")) {
    return <ClientDashboard />;
  }

  if (path.startsWith("/member/dashboard") || path.startsWith("/member/projects") || path.startsWith("/member/tickets")) {
    return <MemberDashboard />;
  }

  return <Login />;
}

export default App;
