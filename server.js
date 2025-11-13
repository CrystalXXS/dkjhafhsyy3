// server.js (improved debug version)
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// --- Debug endpoints ---
app.get("/_health", (req, res) => res.json({ ok: true }));

app.get("/_debug_env", (req, res) => {
  res.json({
    OPENAI_KEY_LOADED: !!process.env.OPENAI_API_KEY,
    PORT: process.env.PORT || null
  });
});

// --- Main proxy endpoint ---
app.post("/api/ask", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt in body" });

  // Basic sanity check
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in environment");
    return res.status(500).json({ error: "Server misconfiguration: missing OPENAI_API_KEY" });
  }

  try {
    // Build the request body
    const payload = {
      model: "gpt-5-mini",               // keep your target model here
      messages: [
        {
          role: "system",
          content: "Sei un insegnante di matematica esperto e gentile. Spiega passo per passo, usa LaTeX tra $$...$$."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.0,
      max_tokens: 800
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      // timeout not built-in in node-fetch v3; you can add AbortController if needed
    });

    const status = resp.status;
    const text = await resp.text(); // read raw body for debug
    // Try to parse JSON if possible
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* not JSON */ }

    console.log("OpenAI response status:", status);
    if (json) {
      console.log("OpenAI response (json):", JSON.stringify(json, null, 2));
    } else {
      console.log("OpenAI response (text):", text);
    }

    if (!resp.ok) {
      // Return helpful debug info to the frontend (useful while debugging locally)
      return res.status(502).json({
        error: "OpenAI API returned an error",
        status,
        body: json ?? text
      });
    }

    // If OK, extract message content safely
    const reply = json?.choices?.[0]?.message?.content;
    if (!reply) {
      console.warn("OpenAI responded ok but no message content found", json);
      return res.status(502).json({
        error: "OpenAI returned no content",
        status,
        body: json ?? text
      });
    }

    return res.json({ reply });
  } catch (err) {
    console.error("Network / fetch error contacting OpenAI:", err);
    return res.status(500).json({ error: "Network error contacting OpenAI", detail: String(err) });
  }
});

// Serve static files so you can place index.html, style.css, script.js here
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT} (PORT=${PORT})`));
