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
app.use(express.static(__dirname));

app.post("/api/ask", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  try {
    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: `
            Sei un insegnante di matematica simpatico e chiaro.
            Rispondi come un essere umano, non come un libro di testo.
            Usa $$ $$ per scrivere formule, ma evita spiegazioni eccessive.
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
    const reply = data?.choices?.[0]?.message?.content?.trim() || "Non ho capito bene.";
    res.json({ reply });
  } catch (err) {
    console.error("❌ Server error while contacting OpenAI:", err);
    res.status(500).json({ reply: "Errore durante la richiesta all'AI." });
  }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
