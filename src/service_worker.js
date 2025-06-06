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
  if (message.action === 'toggleGestureControl') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ['src/content.js']
    });
  }
});