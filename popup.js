// Ativar voz
document.getElementById('start').addEventListener('click', () => {
  chrome.storage.local.set({ vozAtiva: true });

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id)
      chrome.tabs.sendMessage(tabs[0].id, { action: 'start-voice' });
  });
});

// Parar voz
document.getElementById('stop').addEventListener('click', () => {
  chrome.storage.local.set({ vozAtiva: false });

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id)
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stop-voice' });
  });
});
