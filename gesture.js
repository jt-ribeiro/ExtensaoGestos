function iniciarDetecaoGestos() {
  console.log("🤖 Iniciando deteção de gestos com MediaPipe...");

  const video = document.createElement('video');
  video.autoplay = true;
  video.id = 'videoGesture';
  video.style.position = 'fixed';
  video.style.bottom = '10px';
  video.style.right = '10px';
  video.style.zIndex = '9999';
  video.style.width = '200px';
  video.style.border = '2px solid white';
  document.body.appendChild(video);

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
      window.__gestureStream = stream;

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

      const camera = new Camera(video, {
        onFrame: async () => {
          await hands.send({ image: video });
        },
        width: 640,
        height: 480
      });

      camera.start();
      window.__gestureHands = hands;
      window.__gestureCamera = camera;

    })
    .catch(err => {
      console.error("❌ Erro ao aceder à câmara:", err);
    });
}

function contarDedos(landmarks) {
  const dedos = [
    [4, 3],     // polegar
    [8, 6],     // indicador
    [12, 10],   // médio
    [16, 14],   // anelar
    [20, 18],   // mínimo
  ];
  let levantados = 0;

  if (landmarks[4].x < landmarks[3].x) levantados++;

  for (let i = 1; i < dedos.length; i++) {
    const [topo, base] = dedos[i];
    if (landmarks[topo].y < landmarks[base].y) levantados++;
  }

  return levantados;
}

// Iniciar a deteção quando o script for executado
iniciarDetecaoGestos();
