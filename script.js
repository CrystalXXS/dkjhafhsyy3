const speakBtn = document.getElementById("speakBtn");
const stopBtn = document.getElementById("stopBtn");
const conversation = document.getElementById("conversation");

let recognition;
let listening = false;

function createRecognition() {
  if (!('webkitSpeechRecognition' in window)) {
    alert("⚠️ Il tuo browser non supporta il riconoscimento vocale.");
    return null;
  }

  const recog = new webkitSpeechRecognition();
  recog.lang = 'it-IT';
  recog.continuous = false;
  recog.interimResults = false;

  recog.onresult = async (event) => {
    const userText = event.results[0][0].transcript.trim();
    addMessage("👩‍🏫 Tu", userText);
    const reply = await askGPT(userText);
    addMessage("🤖 AI", reply);
    renderMathInElement(conversation, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
      ]
    });

    if (window.didAgent && window.didAgent.say) {
      try { await window.didAgent.say(reply); }
      catch (e) { console.warn("Avatar speech error:", e); }
    }

    speakText(reply);
  };

  recog.onerror = (event) => console.warn("Microfono errore:", event.error);
  recog.onend = () => { listening = false; resetMicStyle(); };

  return recog;
}

speakBtn.onclick = () => {
  if (!recognition) recognition = createRecognition();
  if (recognition && !listening) {
    recognition.start();
    listening = true;
    speakBtn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
    speakBtn.style.boxShadow = '0 0 30px rgba(16,185,129,0.9)';
  }
};

stopBtn.onclick = () => {
  if (recognition && listening) {
    recognition.stop();
    listening = false;
    resetMicStyle();
  }
};

function resetMicStyle() {
  speakBtn.style.background = 'linear-gradient(135deg,#3b82f6,#2563eb)';
  speakBtn.style.boxShadow = '0 0 20px rgba(59,130,246,0.7)';
}

async function askGPT(prompt) {
  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    return data.reply || "Non ho capito bene.";
  } catch (err) {
    console.error("Errore richiesta AI:", err);
    return "Errore durante la richiesta all'AI.";
  }
}
