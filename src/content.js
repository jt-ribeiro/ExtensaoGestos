import * as tf from '@tensorflow/tfjs-core';
import * as handpose from '@tensorflow-models/handpose';
import '@tensorflow/tfjs-backend-webgl';

window.__gesturePaused = false;
window.__gestureStop = false;

// Cria container do vídeo no canto inferior esquerdo
const container = document.createElement('div');
container.id = 'gesture-video-container';
container.style.position = 'fixed';
container.style.bottom = '10px';
container.style.left = '10px';
container.style.zIndex = '100000';
container.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
container.style.borderRadius = '8px';
container.style.padding = '5px';
container.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
container.style.maxWidth = '180px';
container.style.width = 'fit-content';
container.style.display = 'flex';
container.style.flexDirection = 'column';
document.body.appendChild(container);

const video = document.createElement('video');
video.width = 160;
video.height = 120;
video.autoplay = true;
video.style.display = 'block';
video.style.borderRadius = '6px';
container.appendChild(video);

const canvas = document.createElement('canvas');
canvas.width = 160;
canvas.height = 120;
canvas.style.position = 'absolute';
canvas.style.bottom = '10px';
canvas.style.left = '10px';
canvas.style.zIndex = '100001';
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');

let previousHandX = null;
let lastAction = '';
let lastGestureTime = 0;

async function setupWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  return new Promise(resolve => {
    video.onloadedmetadata = () => resolve(video);
  });
}

function getAverage(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function getPalmCenter(landmarks) {
  const x = getAverage([0, 1, 5, 9, 13, 17].map(i => landmarks[i][0]));
  const y = getAverage([0, 1, 5, 9, 13, 17].map(i => landmarks[i][1]));
  return { x, y };
}

function isHandOpen(landmarks) {
  const tips = [8, 12, 16, 20];
  return tips.every(i => landmarks[i][1] < landmarks[i - 2][1]);
}

function isHandClosed(landmarks) {
  const tips = [8, 12, 16, 20];
  return tips.every(i => {
    const dist = Math.hypot(landmarks[i][0] - landmarks[0][0], landmarks[i][1] - landmarks[0][1]);
    return dist < 50;
  });
}

function isPointing(landmarks) {
  const isIndexExtended = landmarks[8][1] < landmarks[6][1];
  const othersBent = [12, 16, 20].every(i => landmarks[i][1] > landmarks[i - 2][1]);
  return isIndexExtended && othersBent;
}

function detectSwipe(currentX) {
  if (previousHandX === null) {
    previousHandX = currentX;
    return null;
  }
  const deltaX = currentX - previousHandX;
  previousHandX = currentX;
  if (Math.abs(deltaX) > 40) {
    return deltaX > 0 ? 'swipeRight' : 'swipeLeft';
  }
  return null;
}

function controlGesture(gesture) {
  const now = Date.now();
  if (now - lastGestureTime < 1000 || gesture === lastAction) return;

  switch (gesture) {
    case 'open':
      console.log('🖐️ Mão aberta – cancelar/desfazer');
      break;
    case 'closed':
      console.log('✊ Mão fechada – clique simulado');
      document.dispatchEvent(new MouseEvent('click'));
      break;
    case 'point':
      console.log('👉 Apontar – mover cursor (demo)');
      break;
    case 'swipeLeft':
      console.log('⬅️ Deslizar para a esquerda – voltar página');
      history.back();
      break;
    case 'swipeRight':
      console.log('➡️ Deslizar para a direita – página seguinte');
      history.forward();
      break;
  }

  lastAction = gesture;
  lastGestureTime = now;
}

async function startDetection() {
  await tf.setBackend('webgl');
  const model = await handpose.load();
  await setupWebcam();

  async function detectLoop() {
    if (window.__gestureStop) return;
    if (!window.__gesturePaused) {
      const predictions = await model.estimateHands(video, true);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (predictions.length > 0) {
        const hand = predictions[0];
        const landmarks = hand.landmarks;
        let gesture = null;

        if (isHandOpen(landmarks)) gesture = 'open';
        else if (isHandClosed(landmarks)) gesture = 'closed';
        else if (isPointing(landmarks)) gesture = 'point';

        const { x } = getPalmCenter(landmarks);
        const swipe = detectSwipe(x);
        if (swipe) gesture = swipe;

        controlGesture(gesture);
      }
    }
    requestAnimationFrame(detectLoop);
  }

  detectLoop();
}

startDetection();



// Código relativo a voz

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
      }
    }
  };

  recognition.onerror = (event) => {
    console.error('Erro no reconhecimento de voz:', event.error);
  };

  recognition.onend = () => {
    // Reinicia automaticamente a escuta
    recognition.start();
  };

  recognition.start();
}

// Ativar comandos por voz após tudo estar carregado
startDetection().then(() => {
  iniciarComandosVoz();
});

