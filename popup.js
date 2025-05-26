document.getElementById('start').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: iniciarReconhecimento
    });
  });
});

function iniciarReconhecimento() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("SpeechRecognition não suportado.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-PT';
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => console.log("🎤 A ouvir...");
  recognition.onresult = (event) => {
    const comando = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    console.log("Comando reconhecido:", comando);

    if (comando.includes("descer")) {
      window.scrollBy(0, 200);
    } else if (comando.includes("subir")) {
      window.scrollBy(0, -200);
    } else if (comando.includes("recarregar")) {
      location.reload();
    }
  };

  recognition.onerror = (e) => console.error("Erro:", e.error);
  recognition.start();
}
