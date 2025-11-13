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

// === Serve static frontend files (index.html, script.js, style.css) ===
app.use(express.static(__dirname));

// === ChatGPT proxy route ===
app.post("/api/ask", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  try {
    const payload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
            Sei un insegnante di matematica esperto e gentile.
            Spiega ogni esercizio passo per passo, controlla i tuoi calcoli
            e mostra le formule in LaTeX tra $$ $$ per essere renderizzate correttamente.
          `
        },
        { role: "user", content: prompt }
      ]
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();

    // Debug info for Render logs
    console.log("🔍 OpenAI response status:", resp.status);
    console.log("📦 OpenAI response body:", JSON.stringify(data, null, 2));

    if (!resp.ok) {
      return res.status(500).json({ reply: "Errore durante la richiesta all'AI." });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || "Non ho capito bene.";
    res.json({ reply });

  } catch (err) {
    console.error("❌ Server error while contacting OpenAI:", err);
    res.status(500).json({ reply: "Errore durante la richiesta all'AI." });
  }
});

// === Serve index.html for all other routes (for Render compatibility) ===
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
