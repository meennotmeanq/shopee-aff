// Shopee Affiliate AI Studio - Background Service Worker

// Enable side panel to open on extension icon click
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('Error setting panel behavior:', error));
  }
});

// Listen for messages from Side Panel or Content Scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        sendResponse({ tab: tabs[0] });
      } else {
        sendResponse({ error: 'No active tab found' });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'DOWNLOAD_IMAGE' || request.action === 'DOWNLOAD_FILE') {
    const { url, filename } = request;
    chrome.downloads.download({
      url: url,
      filename: filename || 'shopee_asset.jpg',
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true;
  }

  // Native Thai TTS Fetcher via Google Translate TTS
  if (request.action === 'FETCH_TTS_AUDIO') {
    const text = request.text;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(text)}`;
    
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`TTS HTTP error ${res.status}`);
        return res.arrayBuffer();
      })
      .then(buffer => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);
        sendResponse({ success: true, base64Audio });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});
