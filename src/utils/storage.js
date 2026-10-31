// Storage helper with fallback for Chrome extension and web dev preview

export const DEFAULT_SETTINGS = {
  aiProvider: 'gemini', // 'gemini' | 'openai'
  geminiApiKey: '',
  geminiModel: 'gemini-3.8-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  affiliateSubId: '',
  affiliateCustomTag: '',
  ttsVoice: 'th-TH',
  ttsPitch: 1.0,
  ttsRate: 1.22, // punchy commercial speed for 8-second video
  voiceEngine: 'google', // 'google' | 'openai'
  openaiVoice: 'nova', // 'nova' (lively creator), 'alloy', 'shimmer', 'fable'
  bgmVolume: 0.25,
  defaultDuration: 8 // seconds
};

export async function getSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['affiliate_settings'], (result) => {
        resolve({ ...DEFAULT_SETTINGS, ...(result?.affiliate_settings || {}) });
      });
    });
  } else {
    try {
      const saved = localStorage.getItem('affiliate_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }
}

export async function saveSettings(settings) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ affiliate_settings: settings }, () => {
        resolve(settings);
      });
    });
  } else {
    try {
      localStorage.setItem('affiliate_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
    return settings;
  }
}

