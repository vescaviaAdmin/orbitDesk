import AdminDashboard from "./pages/AdminDashboard";
import SetPassword from "./pages/SetPassword";

function App() {
  if (window.location.pathname.startsWith("/set-password")) {
    return <SetPassword />;
  }

  return <AdminDashboard />;
}

export default App;
