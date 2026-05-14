import { useState } from "react";

import Login from "./Login";
import Dashboard from "./Dashboard";

export default function App() {

  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  const handleLogout = () => {

    localStorage.removeItem("token");

    setLoggedIn(false);
  };

  if (!loggedIn) {
    return (
      <Login
        onLogin={() => setLoggedIn(true)}
      />
    );
  }

  return (

    <div className="app-container">

      {/* ================= NAVBAR ================= */}

      <div className="navbar">

        <div>
          <h2>
            🛡 AI Insurance Claim Analyzer
          </h2>
        </div>

        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>

      </div>

      {/* ================= DASHBOARD ================= */}

      <Dashboard />

    </div>
  );
}