document.getElementById('start').addEventListener('click', () => {
  chrome.storage.local.set({ vozAtiva: true });
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id)
      chrome.tabs.sendMessage(tabs[0].id, { action: 'start-voice' });
  });
});

document.getElementById('stop').addEventListener('click', () => {
  chrome.storage.local.set({ vozAtiva: false });
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id)
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stop-voice' });
  });
});

document.getElementById('gesture').addEventListener('click', () => {
  console.log("🖱️ Botão 'Ativar gestos' clicado.");

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: async () => {
          // *** ESTE CÓDIGO SERÁ EXECUTADO NA PÁGINA WEB ALVO ***
          console.log("📦 Código injetado começou a executar!");
          // Função para injetar scripts locais da extensão
          function injectScriptLocal(filename) {
            return new Promise((resolve, reject) => {
              if (document.querySelector(`script[src="${chrome.runtime.getURL(filename)}"]`)) {
                resolve();
                return;
              }
              const script = document.createElement('script');
              script.src = chrome.runtime.getURL(filename);
              script.onload = () => resolve();
              script.onerror = () => reject(`Erro ao carregar script: ${filename}`);
              document.head.appendChild(script);
            });
          }

          // Função para contar dedos (DEVE ESTAR AQUI DENTRO DO `func`)
          function contarDedos(landmarks) {
            const dedos = [
              [4, 3],     // polegar
              [8, 6],     // indicador
              [12, 10],   // médio
              [16, 14],   // anelar
              [20, 18],   // mínimo
            ];
            let levantados = 0;

            // Polegar
            if (landmarks[4].x < landmarks[3].x) levantados++; // Sua lógica original

            // Outros dedos
            for (let i = 1; i < dedos.length; i++) {
              const [topo, base] = dedos[i];
              if (landmarks[topo].y < landmarks[base].y) levantados++;
            }
            return levantados;
          }


          try {
            // Injeta os scripts na ordem correta
            await injectScriptLocal('extensao/mediapipe/hands.js');
            await injectScriptLocal('extensao/mediapipe/camera_utils.js');
            console.log("✅ Scripts MediaPipe locais carregados com sucesso.");
            

            // Criar vídeo para webcam
            let video = document.getElementById('videoGesture');
            if (!video) { // Cria se não existir
                video = document.createElement('video');
                video.id = 'videoGesture';
                video.autoplay = true;
                video.style.position = 'fixed';
                video.style.bottom = '10px';
                video.style.right = '10px';
                video.style.zIndex = '9999';
                video.style.width = '200px';
                video.style.height = '150px';
                video.style.border = '2px solid white';
                document.body.appendChild(video);
            }

            // Aceder à câmara
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            console.log("✅ Câmara ativada com sucesso.");

            // Criar instância do Hands com caminho correto para os ficheiros WASM e TFLITE
           

// Aguarda até a classe Hands estar definida
await new Promise((resolve, reject) => {
  const maxTentativas = 50;
  let tentativas = 0;

  const esperarPorHands = () => {
    if (typeof Hands !== "undefined") {
      resolve();
    } else if (tentativas >= maxTentativas) {
      reject(new Error("Classe 'Hands' não foi carregada a tempo."));
    } else {
      tentativas++;
      setTimeout(esperarPorHands, 100);
    }
  };

  esperarPorHands();
});

// Agora é seguro usar Hands
const hands = new Hands({
  locateFile: (file) => chrome.runtime.getURL(`mediapipe/${file}`)
});


            hands.setOptions({
              maxNumHands: 1,
              modelComplexity: 1,
              minDetectionConfidence: 0.7,
              minTrackingConfidence: 0.7
            });

            hands.onResults(results => {
              if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];
                const dedosLevantados = contarDedos(landmarks);
                console.log(`🖐️ Dedos levantados: ${dedosLevantados}`);
              }
            });

            // Criar a câmera para o MediaPipe
            const camera = new Camera(video, {
              onFrame: async () => {
                await hands.send({ image: video });
              },
              width: 640,
              height: 480
            });

            camera.start();

            // Guardar referências globais para desligar depois
            window.__gestureHands = hands;
            window.__gestureCamera = camera;
            window.__gestureStream = stream;

          } catch (err) {
            console.error("❌ Erro ao aceder à câmara ou carregar MediaPipe:", err);
            chrome.runtime.sendMessage({ action: 'gesture-error', message: err.message });
          }
        } // Fim da função 'func' do executeScript
      });
    }
  });
});

// Desligar gestos
document.getElementById('stopGesture').addEventListener('click', () => {
  console.log("🛑 Botão 'Desligar gestos' clicado.");

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          // *** ESTE CÓDIGO SERÁ EXECUTADO NA PÁGINA WEB ***
          const video = document.getElementById('videoGesture');
          if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.remove();
            console.log("🎥 Câmara desligada e vídeo removido.");
          } else {
            console.warn("⚠️ Nenhum vídeo ou stream ativo encontrado.");
          }

          // Limpar referências globais
          if (window.__gestureCamera) {
            window.__gestureCamera.stop();
            window.__gestureCamera = null;
          }
          if (window.__gestureHands) {
            window.__gestureHands.close(); // Chamar .close() para o MediaPipe Hands
            window.__gestureHands = null;
          }
          if (window.__gestureStream) {
            window.__gestureStream.getTracks().forEach(t => t.stop());
            window.__gestureStream = null;
          }
        }
      });
    }
  });
});