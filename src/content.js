import * as tf from '@tensorflow/tfjs-core';
import * as handpose from '@tensorflow-models/handpose';
import '@tensorflow/tfjs-backend-webgl';

// Create container for video and controls
const container = document.createElement('div');
container.style.position = 'fixed';
container.style.bottom = '20px';
container.style.left = '20px';
container.style.zIndex = '100000'; // Increased z-index
container.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
container.style.borderRadius = '12px';
container.style.padding = '10px';
container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
container.style.transition = 'all 0.3s ease';
container.style.maxWidth = '340px';
document.body.appendChild(container);
console.log('Container added to DOM:', container);

// Create video element
const video = document.createElement('video');
video.width = 320;
video.height = 240;
video.autoplay = true;
video.style.display = 'block';
video.style.borderRadius = '8px';
container.appendChild(video);
console.log('Video added to container:', video);

// Create canvas element
const canvas = document.createElement('canvas');
canvas.width = 320;
canvas.height = 240;
canvas.style.position = 'absolute';
canvas.style.top = '10px';
canvas.style.left = '10px';
canvas.style.zIndex = '100001'; // Above video
container.appendChild(canvas);
console.log('Canvas added to container:', canvas);

const ctx = canvas.getContext('2d');

// Create activate button
const activateButton = document.createElement('button');
activateButton.textContent = 'Ativar Câmera';
activateButton.style.display = 'inline-block';
activateButton.style.margin = '15px 5px 0';
activateButton.style.padding = '10px 20px';
activateButton.style.backgroundColor = '#4CAF50';
activateButton.style.color = '#fff';
activateButton.style.border = 'none';
activateButton.style.borderRadius = '8px';
activateButton.style.cursor = 'pointer';
activateButton.style.fontSize = '16px';
activateButton.style.fontWeight = 'bold';
activateButton.style.zIndex = '100002';
activateButton.style.transition = 'background-color 0.2s ease';
container.appendChild(activateButton);
console.log('Activate button added to container:', activateButton);

// Create deactivate button
const deactivateButton = document.createElement('button');
deactivateButton.textContent = 'Desativar Câmera';
deactivateButton.style.display = 'inline-block';
deactivateButton.style.margin = '15px 5px 0';
deactivateButton.style.padding = '10px 20px';
deactivateButton.style.backgroundColor = '#f44336';
deactivateButton.style.color = '#fff';
deactivateButton.style.border = 'none';
deactivateButton.style.borderRadius = '8px';
deactivateButton.style.cursor = 'pointer';
deactivateButton.style.fontSize = '16px';
deactivateButton.style.fontWeight = 'bold';
deactivateButton.style.zIndex = '100002';
deactivateButton.style.transition = 'background-color 0.2s ease';
container.appendChild(deactivateButton);
console.log('Deactivate button added to container:', deactivateButton);

// Hover effects for activate button
activateButton.addEventListener('mouseover', () => {
  activateButton.style.backgroundColor = '#45a049';
});
activateButton.addEventListener('mouseout', () => {
  activateButton.style.backgroundColor = '#4CAF50';
});

// Hover effects for deactivate button
deactivateButton.addEventListener('mouseover', () => {
  deactivateButton.style.backgroundColor = '#d32f2f';
});
deactivateButton.addEventListener('mouseout', () => {
  deactivateButton.style.backgroundColor = '#f44336';
});

let isActive = false;
let stream = null;

async function setupWebcam() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Webcam não suportada');
  }
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  console.log('Webcam stream assigned:', stream);
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      console.log('Video metadata loaded');
      resolve(video);
    };
  });
}

function detectGesture(hand) {
  const landmarks = hand.landmarks;
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const distance = Math.sqrt(
    Math.pow(thumbTip[0] - indexTip[0], 2) +
    Math.pow(thumbTip[1] - indexTip[1], 2)
  );
  return distance < 50 ? 'closed' : 'open';
}

function controlBrowser(gesture) {
  if (gesture === 'open') {
    window.scrollBy(0, -10); // Scroll up
  } else if (gesture === 'closed') {
    window.scrollBy(0, 10); // Scroll down
  }
}

async function startDetection() {
  try {
    await tf.setBackend('webgl');
    const model = await handpose.load();
    await setupWebcam();
    async function detectHands() {
      if (!isActive) return;
      const predictions = await model.estimateHands(video);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (predictions.length > 0) {
        const hand = predictions[0];
        const landmarks = hand.landmarks;
        for (let i = 0; i < landmarks.length; i++) {
          const [x, y] = landmarks[i];
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fillStyle = '#ff5252';
          ctx.fill();
        }
        const gesture = detectGesture(hand);
        controlBrowser(gesture);
      }
      requestAnimationFrame(detectHands);
    }
    detectHands();
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao carregar modelo ou webcam: ' + error.message);
  }
}

activateButton.addEventListener('click', () => {
  if (!isActive) {
    console.log('Activate button clicked');
    isActive = true;
    startDetection();
  }
});

deactivateButton.addEventListener('click', () => {
  if (isActive) {
    console.log('Deactivate button clicked');
    isActive = false;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      console.log('Webcam stopped, canvas cleared');
    }
  }
});