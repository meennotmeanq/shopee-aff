// High-Quality Multi-Engine TTS & Audio Synthesizer
// Supports:
// 1. OpenAI Neural TTS (Model: tts-1, Voices: nova, alloy, shimmer) - Ultra human-like, lively & natural
// 2. Google Thai Speech Audio (Fast commercial speed)
// 3. Live Microphone Voice Recording (อัดเสียงพูด 8 วิ ด้วยตัวเอง)

export class TTSEngine {
  static audioCache = new Map();
  static currentSourceNode = null;

  // 1. OpenAI Human-like Neural Voice
  static async fetchOpenAIAudio(text, apiKey, voice = 'nova', speed = 1.15) {
    if (!apiKey) throw new Error('กรุณาระบุ OpenAI API Key ในหน้าการตั้งค่าเพื่อใช้เสียงพากย์ Neural');

    const cleanText = text.trim();
    const cacheKey = `openai-${voice}-${speed}-${cleanText}`;
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey);
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: cleanText,
        voice: voice || 'nova',
        speed: speed || 1.15
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI TTS error ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    this.audioCache.set(cacheKey, buffer);
    return buffer;
  }

  // 2. Google Thai Speech
  static async fetchGoogleThaiAudio(text) {
    const cleanText = text.trim().slice(0, 200);
    if (!cleanText) return null;

    const cacheKey = `google-${cleanText}`;
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey);
    }

    // Background Service Worker message fallback
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'FETCH_TTS_AUDIO', text: cleanText }, resolve);
        });

        if (response && response.success && response.base64Audio) {
          const binaryString = atob(response.base64Audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const buffer = bytes.buffer;
          this.audioCache.set(cacheKey, buffer);
          return buffer;
        }
      } catch (e) {
        console.warn('Background TTS message failed:', e);
      }
    }

    // Direct fetch
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
      const res = await fetch(url);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        this.audioCache.set(cacheKey, buffer);
        return buffer;
      }
    } catch (e) {}

    return null;
  }

  // Unified audio buffer loader
  static async getAudioBuffer(text, audioContext, settings = {}) {
    if (!text || !text.trim()) return null;

    let arrayBuffer = null;

    // Use OpenAI if selected and API key exists
    if (settings.voiceEngine === 'openai' && settings.openaiApiKey) {
      try {
        arrayBuffer = await this.fetchOpenAIAudio(
          text,
          settings.openaiApiKey,
          settings.openaiVoice || 'nova',
          settings.ttsRate || 1.15
        );
      } catch (err) {
        console.warn('OpenAI TTS failed, falling back to Google Thai:', err);
      }
    }

    // Fallback to Google Thai Speech
    if (!arrayBuffer) {
      arrayBuffer = await this.fetchGoogleThaiAudio(text);
    }

    if (!arrayBuffer) return null;

    try {
      const cloned = arrayBuffer.slice(0);
      return await audioContext.decodeAudioData(cloned);
    } catch (e) {
      console.error('Audio decode error:', e);
      return null;
    }
  }

  // Play audio live
  static async speak(text, options = {}) {
    this.stop();

    if (!text || !text.trim()) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = options.audioContext || new AudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const audioBuffer = await this.getAudioBuffer(text, ctx, options.settings || {});
      if (audioBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        // Tune playback rate for punchy commercial flow
        const rate = options.rate || (options.settings?.voiceEngine === 'openai' ? 1.0 : 1.22);
        source.playbackRate.setValueAtTime(rate, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(options.volume || 1.2, ctx.currentTime);

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        if (options.destination) {
          gainNode.connect(options.destination);
        }

        this.currentSourceNode = source;

        return new Promise((resolve) => {
          source.onended = () => {
            this.currentSourceNode = null;
            resolve();
          };
          source.start(0);
        });
      }
    } catch (err) {
      console.warn('Audio speak error:', err);
    }
  }

  // Record 8 seconds from user microphone
  static async recordMicrophone(durationSeconds = 8.0, onProgress = null) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('เบราว์เซอร์ไม่รองรับการอัดเสียงผ่านไมโครโฟน');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        ctx.close();

        resolve({ blob: audioBlob, buffer: audioBuffer });
      };

      mediaRecorder.onerror = (e) => {
        stream.getTracks().forEach(track => track.stop());
        reject(e);
      };

      mediaRecorder.start();

      let elapsed = 0;
      const interval = 100;
      const timer = setInterval(() => {
        elapsed += interval / 1000;
        if (onProgress) onProgress(Math.min(elapsed / durationSeconds, 1.0));
        if (elapsed >= durationSeconds) {
          clearInterval(timer);
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }
      }, interval);
    });
  }

  static stop() {
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
      } catch (e) {}
      this.currentSourceNode = null;
    }
  }
}
