import * as tf from '@tensorflow/tfjs-core';
import * as handpose from '@tensorflow-models/handpose';
import '@tensorflow/tfjs-backend-webgl';

// Flags globais de controle
window.__gesturePaused = false;
window.__gestureStop = false;

// Container de vídeo/overlay
const container = document.createElement('div');
container.id = 'gesture-video-container';
container.style.position = 'fixed';
container.style.bottom = '10px';
container.style.left = '10px';
container.style.zIndex = '100000';
container.style.backgroundColor = 'rgba(30,30,30,0.9)';
container.style.borderRadius = '8px';
container.style.padding = '5px';
container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
container.style.maxWidth = '180px';
container.style.width = 'fit-content';
container.style.display = 'flex';
container.style.flexDirection = 'column';

document.body.appendChild(container);

// Vídeo
const video = document.createElement('video');
video.width = 160;
video.height = 120;
video.autoplay = true;
video.style.display = 'block';
video.style.borderRadius = '6px';
container.appendChild(video);

// Canvas para landmarks
const canvas = document.createElement('canvas');
canvas.width = 160;
canvas.height = 120;
canvas.style.position = 'absolute';
canvas.style.bottom = '10px';
canvas.style.left = '10px';
canvas.style.zIndex = '100001';
container.appendChild(canvas);

const ctx = canvas.getContext('2d');

let stream = null;

async function setupWebcam() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Webcam não suportada');
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  return new Promise((res) => (video.onloadedmetadata = () => res(video)));
}

// ===========================
//  Gestos

let lastPositions = [];
let lastGestureTime = 0;
let lastZoomTime = 0;
const gestureCooldown = 3000;
const zoomCooldown = 1000; // 1 segundo entre zooms
let scrollActive = false;

function detectGesture(hand) {
  const now = Date.now();
  const landmarks = hand.landmarks;
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const palm = landmarks[0];

  const pinchDistance = Math.hypot(
    thumbTip[0] - indexTip[0],
    thumbTip[1] - indexTip[1]
  );

  // Histórico de movimentos
  lastPositions.push({ x: palm[0], y: palm[1], time: now });
  if (lastPositions.length > 6) lastPositions.shift();

  const dx = lastPositions.at(-1).x - lastPositions[0].x;
  const dy = lastPositions.at(-1).y - lastPositions[0].y;
  const dt = lastPositions.at(-1).time - lastPositions[0].time;

  // === Swipes
  if (!scrollActive && dt < 800) {
    if (Math.abs(dx) > 80) {
      lastGestureTime = now;
      return dx < 0 ? 'swipe-left' : 'swipe-right';
    }
    if (dy > 80) {
      lastGestureTime = now;
      return 'swipe-down';
    }
  }

  // === Pinch (refresh)
  if (!scrollActive && pinchDistance < 15) {
    lastGestureTime = now;
    return 'pinch';
  }

  // === Zoom Out (mais de 150px)
  if (!scrollActive && pinchDistance > 150 && now - lastZoomTime > zoomCooldown) {
    lastZoomTime = now;
    return 'zoom-out';
  }

  // === Zoom In (entre 100 e 150px)
  if (!scrollActive && pinchDistance > 100 && pinchDistance <= 150 && now - lastZoomTime > zoomCooldown) {
    lastZoomTime = now;
    return 'zoom-in';
  }

  // === L-shape
  const dxLI = Math.abs(indexTip[0] - thumbTip[0]);
  const dyLI = Math.abs(indexTip[1] - thumbTip[1]);
  if (!scrollActive && dxLI > 80 && dyLI > 80) {
    lastGestureTime = now;
    return 'L-shape';
  }

  // === Scroll
  if (pinchDistance >= 20 && pinchDistance < 60) {
    scrollActive = true;
    return 'closed';
  }

  if (pinchDistance >= 80 && pinchDistance <= 120) {
    scrollActive = true;
    return 'open';
  }

  scrollActive = false;
  return null;
}



function controlBrowser(gesture) {
  try {
    if (gesture === 'open') {
      window.scrollBy(0, -10);
      console.log('Gesto: open → Scroll up');
    }

    if (gesture === 'closed') {
      window.scrollBy(0, 10);
      console.log('Gesto: closed → Scroll down');
    }

    if (gesture === 'swipe-left') {
      window.history.back();
      console.log('Gesto: swipe-left → Back');
    }
    if (gesture === 'swipe-right') {
      window.history.forward();
      console.log('Gesto: swipe-right → Forward');
    }
    if (gesture === 'swipe-up') {
      window.scrollBy(0, -100);
      console.log('Gesto: swipe-up → Fast up');
    }
    if (gesture === 'swipe-down') {
      window.scrollBy(0, 100);
      console.log('Gesto: swipe-down → Fast down');
    }

    if (gesture === 'pinch') {
      window.location.reload();
      console.log('Gesto: pinch → Refresh');
    }
    if (gesture === 'zoom-in') {
      const z = parseFloat(document.body.style.zoom || 1) + 0.1;
      document.body.style.zoom = z.toFixed(2);
      console.log('Gesto: zoom-in →', z.toFixed(2));
    }
    if (gesture === 'zoom-out') {
      const z = parseFloat(document.body.style.zoom || 1) - 0.1;
      document.body.style.zoom = z.toFixed(2);
      console.log('Gesto: zoom-out →', z.toFixed(2));
    }

    if (gesture === 'L-shape') {
      openContextMenu();
    }
  } catch (e) {
    console.error('Erro no gesto', gesture, e);
  }
}

// ===========================
//  Loop principal
// ===========================
async function startDetection() {
  await tf.setBackend('webgl');
  const model = await handpose.load();
  await setupWebcam();

  async function detectLoop() {
    if (window.__gestureStop) return;

    if (!window.__gesturePaused) {
      const predictions = await model.estimateHands(video, true);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let gestureLabel = '—';

      if (predictions.length > 0) {
        const hand = predictions[0];

        // Desenhar landmarks
        hand.landmarks.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = 'lime';
          ctx.fill();
        });

        const gesture = detectGesture(hand);
        if (gesture) {
          // --- gerir scrollActive & cooldown extra ---
          if (gesture === 'open' || gesture === 'closed') {
            scrollActive = true;
          } else {
            if (scrollActive) lastGestureTime = Date.now();
            scrollActive = false;
          }

          controlBrowser(gesture);
          gestureLabel = gesture;
        } else if (!scrollActive) {
          gestureLabel = '…';
        }
      }

      // HUD de gesto
      ctx.font = '12px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(`Gesto: ${gestureLabel}`, 5, 15);
    }
    requestAnimationFrame(detectLoop);
  }
  detectLoop();
}

startDetection();

// ===========================
//  Helpers extra
// ===========================


// === Comandos por voz ===
function iniciarComandosVoz() {
  if (!('webkitSpeechRecognition' in window)) {
    console.warn('Reconhecimento de voz não suportado neste navegador.');
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'pt-PT';
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        const comando = event.results[i][0].transcript.trim().toLowerCase();
        console.log('Comando de voz reconhecido:', comando);

        // Comandos básicos
        if (comando.includes('subir')) {
          window.scrollBy(0, -50);
        } else if (comando.includes('descer')) {
          window.scrollBy(0, 50);
        } else if (comando.includes('pausar')) {
          window.__gesturePaused = true;
          console.log('Gestos pausados por voz');
        } else if (comando.includes('continuar')) {
          window.__gesturePaused = false;
          console.log('Gestos retomados por voz');
        } else if (comando.includes('encerrar')) {
          window.__gestureStop = true;
          const container = document.getElementById('gesture-video-container');
          if (container) {
            const video = container.querySelector('video');
            if (video?.srcObject) {
              video.srcObject.getTracks().forEach(t => t.stop());
            }
            container.remove();
          }
          console.log('Extensão encerrada por comando de voz');
        }

        // Novos comandos
        else if (comando.includes('voltar')) {
          window.history.back();
        } else if (comando.includes('avançar')) {
          window.history.forward();
        } else if (comando.includes('fechar')) {
          window.close();
        } else if (comando.includes('recarregar') || comando.includes('atualizar')) {
          window.location.reload();
        } else if (comando.startsWith('abrir página')) {
          const partes = comando.split('abrir página');
          const pagina = partes[1]?.trim();
          if (pagina) {
            let url = pagina;
            if (!pagina.startsWith('http')) {
              if (pagina.includes(' ')) {
                // Exemplo: "Abrir página Google"
                url = `https://www.google.com/search?q=${encodeURIComponent(pagina)}`;
              } else {
                url = `https://${pagina}`;
              }
            }
            window.open(url, '_blank');
          }
        } else if (comando.includes('clique no botão')) {
          const botoes = document.querySelectorAll('button');
          if (botoes.length === 1) {
            botoes[0].click();
          } else {
            for (let botao of botoes) {
              if (comando.includes(botao.innerText.toLowerCase())) {
                botao.click();
                break;
              }
            }
          }
        } else if (comando.includes('ativar') || comando.includes('desativar')) {
          // Suporte a alternar classes CSS (exemplo: modo escuro)
          const corpo = document.body;
          corpo.classList.toggle('modo-escuro');
          console.log('Modo escuro alternado');
        } else if (comando.includes('zoom in')) {
          document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) + 0.1).toString();
        } else if (comando.includes('zoom out')) {
          document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) - 0.1).toString();
        } else if (comando.includes('selecionar')) {
          // Exemplo: "Selecionar primeiro link"
          const links = document.querySelectorAll('a');
          if (comando.includes('primeiro') && links.length > 0) {
            links[0].focus();
          } else if (comando.includes('menu')) {
            const menu = document.querySelector('nav, .menu');
            if (menu) menu.focus();
          }
        } else if (comando.includes('ajuda') || comando.includes('assistência')) {
          alert('Instruções de voz disponíveis:\n- Voltar\n- Avançar\n- Fechar\n- Recarregar\n- Abrir página\n- Clique no botão\n- Ativar/Desativar\n- Subir/Descer\n- Zoom in/out\n- Selecionar\n- Ajuda');
        }
      }
    }
  };

  recognition.onerror = (event) => {
    console.error('Erro no reconhecimento de voz:', event.error);
  };

  recognition.onend = () => {
    recognition.start(); // Reinicia automaticamente
  };

  recognition.start();
}

// Ativar comandos por voz após tudo estar carregado
startDetection().then(() => {
  iniciarComandosVoz();
});
