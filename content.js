// Evita criar vários reconhecimentos se o script for injectado de novo
if (!window.__vozIniciada) {
  window.__vozIniciada = true;

  let recognizer = null;

  // Verifica o estado salvo ao carregar a página
  chrome.storage.local.get('vozAtiva', dados => {
    if (dados.vozAtiva) iniciarReconhecimento();
  });

  // Recebe mensagens do popup
  chrome.runtime.onMessage.addListener((msg, _sender, _resp) => {
    if (msg.action === 'start-voice') iniciarReconhecimento();
    if (msg.action === 'stop-voice') pararReconhecimento();
  });

  function iniciarReconhecimento() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('SpeechRecognition não suportado neste navegador.');
      return;
    }

    if (recognizer) return; // já está ativo

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
      recognizer = null;
      console.log('🎤 Reconhecimento parado.');
    };

    recognizer.start();
  }

  function pararReconhecimento() {
    if (recognizer) {
      recognizer.stop();
      recognizer = null;
      console.log('🎤 Reconhecimento parado manualmente.');
    }
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
    else if (c.includes('descer'))          window.scrollBy(0, 200);
    else if (c.includes('zoom in'))         zoom(+0.1);
    else if (c.includes('zoom out'))        zoom(-0.1);
    else if (c.includes('ajuda') ||
             c.includes('assistência'))
      alert('Comandos: voltar, avançar, recarregar, abrir página ..., subir, descer, zoom in/out, parar extensão …');
    else if (c.includes('parar extensão') ||
             c.includes('desligar extensão')) {
      chrome.storage.local.set({ vozAtiva: false });
      pararReconhecimento();
    }

    function zoom(delta) {
      const z = parseFloat(document.body.style.zoom || 1) + delta;
      document.body.style.zoom = z.toString();
    }
  }
}
