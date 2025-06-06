import * as tf from '@tensorflow/tfjs-core';
import * as handpose from '@tensorflow-models/handpose';
import '@tensorflow/tfjs-backend-webgl';

// Flags globais de controle
window.__gesturePaused = false;
window.__gestureStop = false;

// Container
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

// Vídeo
const video = document.createElement('video');
video.width = 160;
video.height = 120;
video.autoplay = true;
video.style.display = 'block';
video.style.borderRadius = '6px';
container.appendChild(video);

// Canvas
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
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Webcam não suportada');
  }
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

function detectGesture(hand) {
  const landmarks = hand.landmarks;
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const distance = Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]);
  return distance < 40 ? 'closed' : 'open';
}

function controlBrowser(gesture) {
  if (gesture === 'open') {
    window.scrollBy(0, -10);
  } else if (gesture === 'closed') {
    window.scrollBy(0, 10);
  }
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
        const gesture = detectGesture(predictions[0]);
        controlBrowser(gesture);
      }
    }

    requestAnimationFrame(detectLoop);
  }

  detectLoop();
}

startDetection();
