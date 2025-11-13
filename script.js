const speakBtn = document.getElementById("speakBtn");
const stopBtn = document.getElementById("stopBtn");
const conversation = document.getElementById("conversation");

let recognition;
let listening = false;

// ===== VOICE RECOGNITION =====
function createRecognition() {
  if (!('webkitSpeechRecognition' in window)) {
    alert("⚠️ Il tuo browser non supporta il riconoscimento vocale.");
    return null;
  }

  const recog = new webkitSpeechRecognition();
  recog.lang = 'it-IT';
  recog.continuous = false;
  recog.interimResults = false;

  recog.onerror = (event) => {
    console.warn("Errore microfono:", event.error);
    resetMicStyle();
  };

  recog.onresult = async (event) => {
    const userText = event.results[0][0].transcript;
    addMessage("👩‍🏫 Tu", userText);
    const reply = await askGPT(userText);
    addMessage("🤖 AI", reply);

    // Trigger D-ID avatar speech
    if (window.didAgent && window.didAgent.isReady) {
      window.didAgent.say(reply);
    } else {
      console.warn("D-ID agent non pronto ancora.");
    }

    speakText(reply);
  };

  recog.onend = () => {
    listening = false;
    resetMicStyle();
  };

  return recog;
}

speakBtn.onclick = () => {
  if (!recognition) recognition = createRecognition();
  if (recognition && !listening) {
    recognition.start();
    listening = true;
    speakBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
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
  speakBtn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
  speakBtn.style.boxShadow = '0 0 20px rgba(59,130,246,0.7)';
}

// ===== ASK GPT THROUGH BACKEND =====
async function askGPT(prompt) {
  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    const reply = data.reply || "Non ho capito bene.";
    renderMath(reply);
    return reply;
  } catch (err) {
    console.error(err);
    return "Errore durante la richiesta all'AI.";
  }
}

// ===== RENDER CHAT MESSAGES =====
function addMessage(speaker, text) {
  const div = document.createElement("div");
  div.className = "message";
  div.innerHTML = `<strong>${speaker}</strong><p>${text}</p>`;
  conversation.appendChild(div);
  conversation.scrollTop = conversation.scrollHeight;
}

function renderMath(text) {
  const div = document.createElement("div");
  div.className = "message";
  div.innerHTML = `<strong>🤖 AI</strong><p>${text}</p>`;
  conversation.appendChild(div);

  renderMathInElement(div, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false }
    ]
  });

  conversation.scrollTop = conversation.scrollHeight;
}

// ===== TEXT-TO-SPEECH FALLBACK =====
function speakText(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "it-IT";
  utter.rate = 1.0;
  window.speechSynthesis.speak(utter);
}

// ===== WAIT FOR D-ID AGENT =====
window.addEventListener("didAgentLoaded", () => {
  console.log("✅ D-ID agent pronto!");
  window.didAgent.isReady = true;
});
