// Evita criar vários reconhecimentos se o script for injectado de novo
if (!window.__vozIniciada) {
  window.__vozIniciada = true;

  let recognizer = null;

  // Ouve a mensagem que vem do popup
  chrome.runtime.onMessage.addListener((msg, _sender, _resp) => {
    if (msg.action === 'start-voice') iniciarReconhecimento();
  });

  function iniciarReconhecimento() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('SpeechRecognition não suportado neste navegador.');
      return;
    }

    // Se já estava ligado não volta a ligar
    if (recognizer) return;

    recognizer = new SR();
    recognizer.lang = 'pt-PT';
    recognizer.continuous = true;
    recognizer.interimResults = false;

    recognizer.onstart = () => console.log('🎤 A ouvir...');
    recognizer.onresult = e => {
      const comando = e.results[e.results.length - 1][0].transcript
        .trim()
        .toLowerCase();
      console.log('Comando:', comando);
      executarComando(comando);
    };
    recognizer.onerror = err => console.error('Erro:', err.error);
    recognizer.onend = () => {
      // Se a página recarregar o script volta a correr, por isso basta parar
      recognizer = null;
    };

    recognizer.start();
  }

  function executarComando(c) {
    const abrir = urlOuNome => {
      let url = urlOuNome.trim();
      if (!url.startsWith('http'))
        url = url.includes('.') ? `https://${url}` : `https://www.${url}.com`;
      window.open(url, '_blank');
    };

    if (c.includes('voltar'))               history.back();
    else if (c.includes('avançar'))         history.forward();
    else if (c.includes('fechar'))          window.close();
    else if (c.includes('recarregar') ||
             c.includes('atualizar'))       location.reload();
    else if (c.startsWith('abrir página'))  abrir(c.replace('abrir página', ''));
    else if (c.includes('subir'))           window.scrollBy(0, -200);
    else if (c.includes('descer'))          window.scrollBy(0,  200);
    else if (c.includes('zoom in'))         zoom(+0.1);
    else if (c.includes('zoom out'))        zoom(-0.1);
    else if (c.includes('ajuda') ||
             c.includes('assistência'))
      alert('Comandos: voltar, avançar, recarregar, abrir página ..., subir, descer, zoom in/out …');

    function zoom(delta) {
      const z = parseFloat(document.body.style.zoom || 1) + delta;
      document.body.style.zoom = z.toString();
    }
  }
}
