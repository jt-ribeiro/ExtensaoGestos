import * as tf from '@tensorflow/tfjs-core';
import * as handpose from '@tensorflow-models/handpose';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'gesture-control',
    title: 'Ativar Controle por Gestos',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'gesture-control') {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content.js']
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { action, tabId } = message;
    console.log('Mensagem recebida no service worker:', message);
  
    if (!tabId) return;
  
    if (action === 'startGestureControl') {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content.js']
      });
    }
  
    if (action === 'pauseGestureControl') {
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          console.log('Pausando gestos...');
          window.__gesturePaused = true;
        }
      });
    }
  
    if (action === 'stopGestureControl') {
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          console.log('Encerrando controle de gestos...');
          const container = document.getElementById('gesture-video-container');
          if (container) {
            const video = container.querySelector('video');
            if (video?.srcObject) {
              video.srcObject.getTracks().forEach(t => t.stop());
            }
            container.remove();
          }
          window.__gesturePaused = false;
          window.__gestureStop = true;
        }
      });
    }
  });
  