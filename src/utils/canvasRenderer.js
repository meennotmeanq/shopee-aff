// 8-Second Ultra-Fast Vertical 9:16 Video Canvas Engine
import { TTSEngine } from './ttsEngine';

export class CanvasVideoEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 1080;
    this.height = 1920;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.duration = 8.0; // 8 seconds exact
    this.fps = 30;
    this.isPlaying = false;
    this.isRecording = false;
    this.animationFrameId = null;
    this.startTime = 0;
    this.currentTime = 0;

    // Loaded image cache
    this.loadedImages = [];

    // Audio Context
    this.audioCtx = null;
    this.audioDest = null;
    this.currentVoiceSource = null;
  }

  async loadImages(imageUrls) {
    this.loadedImages = [];
    const promises = imageUrls.slice(0, 5).map(url => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve(fallbackImg);
          fallbackImg.onerror = () => resolve(null);
          fallbackImg.src = url;
        };
        img.src = url;
      });
    });

    const results = await Promise.all(promises);
    this.loadedImages = results.filter(img => img !== null);
    return this.loadedImages.length > 0;
  }

  // Audio setup with mixed Voiceover + Upbeat BGM
  initAudio(voiceBuffer = null, settings = {}) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
      this.audioDest = this.audioCtx.createMediaStreamDestination();

      const masterBgmGain = this.audioCtx.createGain();
      // Lower BGM slightly when voice is speaking
      masterBgmGain.gain.setValueAtTime(voiceBuffer ? 0.12 : 0.22, this.audioCtx.currentTime);
      masterBgmGain.connect(this.audioDest);
      masterBgmGain.connect(this.audioCtx.destination);

      // 1. Play Voiceover buffer if present
      if (voiceBuffer) {
        const voiceSource = this.audioCtx.createBufferSource();
        voiceSource.buffer = voiceBuffer;

        const rate = settings.voiceEngine === 'openai' ? 1.0 : (settings.ttsRate || 1.22);
        voiceSource.playbackRate.setValueAtTime(rate, this.audioCtx.currentTime);

        const voiceGain = this.audioCtx.createGain();
        voiceGain.gain.setValueAtTime(1.5, this.audioCtx.currentTime);

        voiceSource.connect(voiceGain);
        voiceGain.connect(this.audioDest);
        voiceGain.connect(this.audioCtx.destination);

        // Start speaking at 0.1s
        voiceSource.start(this.audioCtx.currentTime + 0.1);
        this.currentVoiceSource = voiceSource;
      }

      // 2. Upbeat commercial BGM
      const bpm = 125;
      const notes = [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 261.63];
      const now = this.audioCtx.currentTime;

      // 8 seconds = 16 eighth notes
      for (let i = 0; i < 16; i++) {
        const osc = this.audioCtx.createOscillator();
        const noteGain = this.audioCtx.createGain();
        osc.type = i % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(notes[i % notes.length], now + i * 0.5);

        noteGain.gain.setValueAtTime(0.15, now + i * 0.5);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.5 + 0.4);

        osc.connect(noteGain);
        noteGain.connect(masterBgmGain);

        osc.start(now + i * 0.5);
        osc.stop(now + i * 0.5 + 0.45);

        // Kick drum on every beat
        if (i % 2 === 0) {
          const kick = this.audioCtx.createOscillator();
          const kickGain = this.audioCtx.createGain();
          kick.frequency.setValueAtTime(150, now + i * 0.5);
          kick.frequency.exponentialRampToValueAtTime(30, now + i * 0.5 + 0.15);
          kickGain.gain.setValueAtTime(0.35, now + i * 0.5);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.5 + 0.2);
          kick.connect(kickGain);
          kickGain.connect(masterBgmGain);
          kick.start(now + i * 0.5);
          kick.stop(now + i * 0.5 + 0.25);
        }
      }
    } catch (e) {
      console.warn('Audio synthesis not supported or blocked:', e);
    }
  }

  stopAudio() {
    if (this.currentVoiceSource) {
      try {
        this.currentVoiceSource.stop();
      } catch (e) {}
      this.currentVoiceSource = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch (e) {}
    }
    this.audioCtx = null;
    this.audioDest = null;
  }

  // Draw a frame at time t (0 to 8 seconds)
  renderFrame(t, scriptData = {}) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const hookText = scriptData.hookText || "อย่าเพิ่งเลื่อนผ่าน! ไอเทมลับบอกต่อ";
    const highlightText = scriptData.highlightText || "ของแท้ คุณภาพดีเกินราคา คุ้มมาก";
    const priceText = scriptData.priceText || "฿299";
    const discountText = scriptData.discountText || "ลดพิเศษวันนี้";
    const ctaText = scriptData.ctaText || "จิ้มตะกร้าเหลืองซ้ายล่างด่วน!";

    let currentImageIndex = 0;
    let sceneProgress = 0;

    if (t < 2.6) {
      currentImageIndex = 0;
      sceneProgress = t / 2.6;
    } else if (t < 5.5) {
      currentImageIndex = Math.min(1, this.loadedImages.length - 1);
      sceneProgress = (t - 2.6) / 2.9;
    } else {
      currentImageIndex = Math.min(2, this.loadedImages.length - 1);
      sceneProgress = (t - 5.5) / 2.5;
    }

    const currentImg = this.loadedImages[currentImageIndex] || this.loadedImages[0];

    // 1. Blurred Backdrop
    if (currentImg) {
      ctx.save();
      ctx.filter = 'blur(40px) brightness(0.65)';
      const bgScale = 1.2 + (sceneProgress * 0.08);
      const bgW = w * bgScale;
      const bgH = h * bgScale;
      ctx.drawImage(currentImg, (w - bgW) / 2, (h - bgH) / 2, bgW, bgH);
      ctx.restore();
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1E293B');
      grad.addColorStop(1, '#0F172A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Main Product Image
    if (currentImg) {
      ctx.save();
      const cardW = 920;
      const cardH = 920;
      const cardX = (w - cardW) / 2;
      const cardY = 420;

      const zoom = 1.0 + (sceneProgress * 0.06);
      ctx.translate(w / 2, cardY + cardH / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -(cardY + cardH / 2));

      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 35;
      ctx.shadowOffsetY = 15;

      this.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 40, '#FFFFFF');

      ctx.save();
      ctx.beginPath();
      this.roundedRectPath(ctx, cardX + 10, cardY + 10, cardW - 20, cardH - 20, 32);
      ctx.clip();

      const aspect = currentImg.width / currentImg.height;
      let drawW, drawH, drawX, drawY;
      if (aspect > 1) {
        drawH = cardH - 20;
        drawW = drawH * aspect;
        drawX = cardX + 10 + ((cardW - 20) - drawW) / 2;
        drawY = cardY + 10;
      } else {
        drawW = cardW - 20;
        drawH = drawW / aspect;
        drawX = cardX + 10;
        drawY = cardY + 10 + ((cardH - 20) - drawH) / 2;
      }
      ctx.drawImage(currentImg, drawX, drawY, drawW, drawH);
      ctx.restore();

      ctx.restore();
    }

    // 3. Top Header Badge
    ctx.save();
    const topBadgeW = 540;
    const topBadgeH = 80;
    const topBadgeX = (w - topBadgeW) / 2;
    const topBadgeY = 160;

    this.drawRoundedRect(ctx, topBadgeX, topBadgeY, topBadgeW, topBadgeH, 40, '#EE4D2D');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛍️ SHOPEE ของดีบอกต่อ', w / 2, topBadgeY + topBadgeH / 2);
    ctx.restore();

    // 4. Dynamic Text Overlays
    if (t < 2.6) {
      this.drawHookCard(ctx, hookText, w, 1420);
    } else if (t < 5.5) {
      this.drawHighlightCard(ctx, highlightText, priceText, discountText, w, 1380);
    } else {
      this.drawCtaCard(ctx, ctaText, priceText, w, 1400, sceneProgress);
    }

    // 5. Progress Bar
    const progressWidth = (t / this.duration) * w;
    ctx.fillStyle = '#FFE600';
    ctx.fillRect(0, 0, progressWidth, 16);
  }

  drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
    ctx.save();
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    this.roundedRectPath(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.restore();
  }

  roundedRectPath(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  drawHookCard(ctx, text, canvasW, y) {
    ctx.save();
    const boxW = 960;
    const boxH = 240;
    const x = (canvasW - boxW) / 2;

    this.drawRoundedRect(ctx, x, y, boxW, boxH, 30, 'rgba(0, 0, 0, 0.88)');

    this.drawRoundedRect(ctx, x + 40, y - 25, 260, 50, 25, '#FFE600');
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 26px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ ดูให้จบนะ!', x + 170, y);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 46px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    this.drawWrappedText(ctx, text, canvasW / 2, y + boxH / 2, 880, 56);
    ctx.restore();
  }

  drawHighlightCard(ctx, highlightText, price, discount, canvasW, y) {
    ctx.save();
    const boxW = 960;
    const boxH = 340;
    const x = (canvasW - boxW) / 2;

    this.drawRoundedRect(ctx, x, y, boxW, boxH, 30, 'rgba(0, 0, 0, 0.88)');

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    this.drawWrappedText(ctx, `✨ ${highlightText}`, canvasW / 2, y + 80, 880, 50);

    const priceY = y + 210;
    ctx.fillStyle = '#FFE600';
    ctx.font = '900 76px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(price, canvasW / 2 - 80, priceY);

    if (discount) {
      this.drawRoundedRect(ctx, canvasW / 2 + 100, priceY - 45, 180, 60, 15, '#EE4D2D');
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px "Prompt", sans-serif';
      ctx.fillText(discount, canvasW / 2 + 190, priceY - 10);
    }
    ctx.restore();
  }

  drawCtaCard(ctx, ctaText, price, canvasW, y, progress) {
    ctx.save();
    const boxW = 960;
    const boxH = 320;
    const x = (canvasW - boxW) / 2;

    const pulse = Math.sin(progress * Math.PI * 4) * 10;
    this.drawRoundedRect(ctx, x - pulse / 2, y - pulse / 2, boxW + pulse, boxH + pulse, 35, '#FFE600');

    ctx.fillStyle = '#000000';
    ctx.font = '900 54px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👇 ' + ctaText, canvasW / 2, y + 100);

    this.drawRoundedRect(ctx, canvasW / 2 - 280, y + 180, 560, 75, 20, '#EE4D2D');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px "Prompt", sans-serif';
    ctx.fillText('⚡ กดที่ตะกร้าซ้ายล่างได้เลย!', canvasW / 2, y + 220);
    ctx.restore();
  }

  drawWrappedText(ctx, text, x, startY, maxWidth, lineHeight) {
    const words = text.split('');
    let line = '';
    const lines = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line);
        line = words[n];
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    const displayLines = lines.slice(0, 2);
    const totalH = (displayLines.length - 1) * lineHeight;
    let currentY = startY - totalH / 2;

    displayLines.forEach(l => {
      ctx.fillText(l, x, currentY);
      currentY += lineHeight;
    });
  }

  // Preview Playback with Voiceover + BGM
  async playPreview(scriptData, onProgress, onEnd) {
    this.stop();
    this.isPlaying = true;

    let voiceBuffer = null;
    if (scriptData.customAudioBuffer) {
      voiceBuffer = scriptData.customAudioBuffer;
    } else {
      const voiceText = scriptData.voiceoverText || scriptData.voiceoverScript;
      if (voiceText) {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const tempCtx = new AudioContext();
          voiceBuffer = await TTSEngine.getAudioBuffer(voiceText, tempCtx, scriptData.settings || {});
          tempCtx.close();
        } catch (e) {
          console.warn('Could not decode preview voice buffer:', e);
        }
      }
    }

    if (!this.isPlaying) return;

    this.startTime = performance.now();
    this.initAudio(voiceBuffer, scriptData.settings || {});

    const loop = (now) => {
      if (!this.isPlaying) return;
      const elapsed = (now - this.startTime) / 1000;
      this.currentTime = Math.min(elapsed, this.duration);

      this.renderFrame(this.currentTime, scriptData);
      if (onProgress) onProgress(this.currentTime / this.duration);

      if (elapsed < this.duration) {
        this.animationFrameId = requestAnimationFrame(loop);
      } else {
        this.stop();
        if (onEnd) onEnd();
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  // Export 8-Second Video with Voiceover Mixed In
  async exportVideo(scriptData, onProgress) {
    this.stop();
    this.isRecording = true;

    // 1. Pre-fetch Thai audio buffer before recording
    let voiceBuffer = null;
    if (scriptData.customAudioBuffer) {
      voiceBuffer = scriptData.customAudioBuffer;
    } else {
      const voiceText = scriptData.voiceoverText || scriptData.voiceoverScript;
      if (voiceText) {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const tempCtx = new AudioContext();
          voiceBuffer = await TTSEngine.getAudioBuffer(voiceText, tempCtx, scriptData.settings || {});
          tempCtx.close();
        } catch (e) {
          console.warn('Could not decode export voice buffer:', e);
        }
      }
    }

    // 2. Initialize Audio with the voiceBuffer connected to audioDest!
    this.initAudio(voiceBuffer, scriptData.settings || {});

    // 3. Stream from canvas
    const canvasStream = this.canvas.captureStream(this.fps);
    
    // Add mixed audio track (Voice + BGM)
    let combinedStream = canvasStream;
    if (this.audioDest && this.audioDest.stream.getAudioTracks().length > 0) {
      const audioTrack = this.audioDest.stream.getAudioTracks()[0];
      combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        audioTrack
      ]);
    }

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 6000000
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        this.stopAudio();
        this.isRecording = false;
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };

      recorder.onerror = (e) => {
        this.stopAudio();
        this.isRecording = false;
        reject(e);
      };

      recorder.start();

      const startTime = performance.now();
      const interval = 1000 / this.fps;
      let frameTime = 0;

      const recordStep = () => {
        if (!this.isRecording) return;
        frameTime += interval / 1000;
        this.renderFrame(frameTime, scriptData);

        if (onProgress) onProgress(Math.min(frameTime / this.duration, 1.0));

        if (frameTime < this.duration) {
          setTimeout(recordStep, interval);
        } else {
          recorder.stop();
        }
      };

      recordStep();
    });
  }

  stop() {
    this.isPlaying = false;
    this.isRecording = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.stopAudio();
  }
}
