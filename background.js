chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "iniciarReconhecimento") {
    iniciarReconhecimento();
  }
});

function iniciarReconhecimento() {
  const SpeechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error("SpeechRecognition não suportado.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-PT';
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => console.log("🎙️ A ouvir comandos de voz...");
  
  recognition.onresult = (event) => {
    const comando = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    console.log("🗣️ Comando reconhecido:", comando);

    // 🔍 Log especial para comandos relacionados com gestos
    if (comando.includes("gesto") || comando.includes("gestos")) {
      console.log("🖐️ Comando de gesto detetado:", comando);
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: interpretarComando,
        args: [comando]
      });
    });
  };

  recognition.onerror = (e) => console.error("Erro no reconhecimento:", e.error);

  recognition.onend = () => {
    console.log("Reconhecimento terminou, a reiniciar...");
    recognition.start(); // Reiniciar automaticamente após terminar
  };

  recognition.start();
}
