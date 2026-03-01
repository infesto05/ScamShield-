import React, { useState } from "react";
import axios from "axios";
import "./App.css";

// 🔥 Uses environment variable in production
const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://scamshield-backend-4pz8.onrender.com";

function App() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeMessage = async () => {
    if (!message.trim()) {
      alert("Please enter a message");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/analyze`, {
        message,
      });

      setResult(response.data);
    } catch (error) {
      alert("Backend connection error. Please try again.");
      console.error("API Error:", error);
    }

    setLoading(false);
  };

  const clearAll = () => {
    setMessage("");
    setResult(null);
  };

  const getRiskColor = (risk) => {
    if (risk === "High Risk") return "#ef4444";
    if (risk === "Medium Risk") return "#f59e0b";
    return "#10b981";
  };

  const getDecisionColor = (decision) => {
    if (decision === "DO NOT RESPOND") return "#ef4444";
    if (decision === "VERIFY BEFORE RESPONDING") return "#f59e0b";
    return "#10b981";
  };

  return (
    <div className="container">
      <div className="card">
        <h1>🛡️ ScamShield</h1>
        <p className="subtitle">
          Detects phishing, investment fraud & WhatsApp pump scams using Hybrid AI
        </p>

        <textarea
          placeholder="Paste suspicious message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <div className="button-group">
          <button onClick={analyzeMessage} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze Message"}
          </button>

          <button className="clear-btn" onClick={clearAll}>
            Clear
          </button>
        </div>

        {result && (
          <div
            className="result"
            style={{ borderColor: getRiskColor(result.riskLevel) }}
          >
            <h2 style={{ color: getRiskColor(result.riskLevel) }}>
              {result.riskLevel}
            </h2>

            <div className="progress-bar">
              <div
                className="progress"
                style={{
                  width: `${result.score}%`,
                  backgroundColor: getRiskColor(result.riskLevel),
                }}
              ></div>
            </div>

            <p>
              <strong>Confidence Score:</strong> {result.responseConfidence}
            </p>

            <p>
              <strong>Scam Type:</strong>{" "}
              <span className="badge">{result.scamType}</span>
            </p>

            <div
              className="decision-box"
              style={{ borderColor: getDecisionColor(result.decision) }}
            >
              <h3 style={{ color: getDecisionColor(result.decision) }}>
                {result.decision}
              </h3>
              <p>{result.actionAdvice}</p>
            </div>

            <p className="indicators-title">
              <strong>Detected Indicators:</strong>
            </p>
            <p>
              {result.flaggedWords && result.flaggedWords.length > 0
                ? result.flaggedWords.join(", ")
                : "No strong scam indicators detected."}
            </p>

            <a
              href="https://www.cybercrime.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="report-btn"
            >
              🚨 Report to Cyber Crime Portal
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;