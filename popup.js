// Envia uma mensagem “start” à aba activa
document.getElementById('start').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id)
      chrome.tabs.sendMessage(tabs[0].id, { action: 'start-voice' });
  });
});
