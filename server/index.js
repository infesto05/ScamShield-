require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

/* ============================
   PRODUCTION MIDDLEWARE
============================ */

// Allow all origins (for hackathon deployment)
app.use(cors({ origin: "*" }));

app.use(express.json());

const PORT = process.env.PORT || 5000;

/* ============================
   RULE-BASED ANALYSIS ENGINE
============================ */
function analyzeMessage(message) {
  let score = 0;
  let flaggedWords = new Set();

  const lowerMessage = message.toLowerCase();

  const urgentWords = ["urgent", "immediately", "now", "hurry"];
  const threatWords = ["blocked", "suspended", "terminated", "deactivated"];
  const financialWords = ["bank", "account", "otp", "kyc", "upi", "loan"];
  const personalInfoWords = ["password", "pin", "cvv", "verify"];

  const investmentScamWords = [
    "multibagger",
    "guaranteed",
    "double",
    "profit",
    "returns",
    "stock tip",
    "investment",
    "crypto",
    "high returns",
    "limited seats",
    "pump",
    "go up",
    "target price"
  ];

  const socialManipulationWords = [
    "join free",
    "whatsapp group",
    "telegram group",
    "no advance payment"
  ];

  const applyScoring = (wordList, weight) => {
    wordList.forEach(word => {
      if (lowerMessage.includes(word)) {
        score += weight;
        flaggedWords.add(word);
      }
    });
  };

  applyScoring(urgentWords, 15);
  applyScoring(threatWords, 20);
  applyScoring(financialWords, 20);
  applyScoring(personalInfoWords, 25);
  applyScoring(investmentScamWords, 25);
  applyScoring(socialManipulationWords, 20);

  // Suspicious link detection
  const linkPattern = /(http|https):\/\/[^\s]+/g;
  if (lowerMessage.match(linkPattern)) {
    score += 25;
    flaggedWords.add("Suspicious Link");
  }

  // WhatsApp invite detection
  if (lowerMessage.includes("chat.whatsapp.com")) {
    score += 30;
    flaggedWords.add("WhatsApp Invite Link");
  }

  // Unrealistic return pattern
  const unrealisticReturnPattern = /\d+\s*(%|\+)|\b\d+\s*to\s*\d+/g;
  if (lowerMessage.match(unrealisticReturnPattern)) {
    score += 20;
    flaggedWords.add("Unrealistic Returns Pattern");
  }

  // All caps hype detection
  if (message === message.toUpperCase() && message.length > 15) {
    score += 10;
    flaggedWords.add("Excessive Capitalization");
  }

  if (score > 100) score = 100;

  let scamType = "General Scam";

  if (financialWords.some(w => lowerMessage.includes(w))) {
    scamType = "Phishing Scam";
  } else if (investmentScamWords.some(w => lowerMessage.includes(w))) {
    scamType = "Investment Scam";
  } else if (lowerMessage.includes("lottery")) {
    scamType = "Lottery Scam";
  }

  return {
    score,
    flaggedWords: Array.from(flaggedWords),
    scamType
  };
}

/* ============================
   ANALYZE ENDPOINT
============================ */
app.post("/analyze", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const ruleResult = analyzeMessage(message);

    let aiScore = 0;

    try {
      const aiResponse = await axios.post(
        "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english",
        { inputs: message },
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_TOKEN}`,
          },
          timeout: 8000,
        }
      );

      if (Array.isArray(aiResponse.data) && aiResponse.data[0]) {
        const prediction = aiResponse.data[0];

        if (prediction.label === "NEGATIVE") {
          aiScore = prediction.score * 100;
        }
      }

    } catch (err) {
      console.log("AI unavailable → rule engine only");
    }

    const finalScore = Math.min(
      Math.round((ruleResult.score * 0.7) + (aiScore * 0.3)),
      100
    );

    const riskLevel =
      finalScore > 75 ? "High Risk" :
      finalScore > 45 ? "Medium Risk" :
      "Low Risk";

    let decision = "";
    let actionAdvice = "";

    if (finalScore > 75) {
      decision = "DO NOT RESPOND";
      actionAdvice =
        "This message strongly matches scam behavior patterns. Do not reply, do not click links, and never share personal or financial details.";
    } else if (finalScore > 45) {
      decision = "VERIFY BEFORE RESPONDING";
      actionAdvice =
        "This message contains suspicious elements. Verify the sender independently before taking any action.";
    } else {
      decision = "LIKELY SAFE";
      actionAdvice =
        "No major scam indicators detected. Still remain cautious while engaging online.";
    }

    res.json({
      score: finalScore,
      ruleScore: ruleResult.score,
      aiScore: Math.round(aiScore),
      riskLevel,
      scamType: ruleResult.scamType,
      flaggedWords: ruleResult.flaggedWords,
      decision,
      actionAdvice,
      responseConfidence: `${finalScore}%`
    });

  } catch (error) {
    console.error("Server Error:", error.message);
    res.status(500).json({ error: "Analysis failed" });
  }
});

/* ============================
   HEALTH CHECK ROUTE
============================ */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "ScamShield Backend Running",
    version: "1.0.0"
  });
});

/* ============================
   START SERVER
============================ */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});