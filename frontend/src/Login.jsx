import { useState } from "react";

import api from "./api";

export default function Login({
  onLogin
}) {

  const [isRegister, setIsRegister] =
    useState(false);

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const handleSubmit = async () => {

    try {

      if (isRegister) {

        await api.post("/register", {
          name,
          email,
          password
        });

        alert(
          "Registration successful. Please login."
        );

        setIsRegister(false);

        return;
      }

      const res = await api.post(
        "/login",
        {
          email,
          password
        }
      );

      localStorage.setItem(
        "token",
        res.data.token
      );

      alert("Login successful");

      onLogin();

    } catch (err) {

      console.error(err);

      alert(
        err.response?.data?.msg ||
        "Authentication failed"
      );
    }
  };

  return (

    <div className="login-container">

      <div className="login-card">

        <h1>
          AI Insurance Claim Analyzer
        </h1>

        <p>
          Secure Insurance Claim
          Processing using AI & NLP
        </p>

        {

          isRegister && (

            <input
              type="text"
              placeholder="Full Name"
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          )
        }

        <input
          type="email"
          placeholder="Email"
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button
          className="login-btn"
          onClick={handleSubmit}
        >

          {
            isRegister
              ? "Register"
              : "Login"
          }

        </button>

        <p
          style={{
            marginTop: "15px",
            cursor: "pointer",
            color: "#38bdf8"
          }}
          onClick={() =>
            setIsRegister(!isRegister)
          }
        >

          {
            isRegister
              ? "Already have an account? Login"
              : "Don't have an account? Register"
          }

        </p>

      </div>

    </div>
  );
}