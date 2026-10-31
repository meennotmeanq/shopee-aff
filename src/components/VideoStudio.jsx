import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Square, Download, Sparkles, Volume2, 
  RotateCcw, Sliders, Film, Check, ExternalLink, AlertCircle, Mic, Trash2 
} from 'lucide-react';
import { CanvasVideoEngine } from '../utils/canvasRenderer';
import { TTSEngine } from '../utils/ttsEngine';

export default function VideoStudio({ 
  product, 
  selectedImages, 
  scriptData, 
  settings, 
  onUpdateScriptData 
}) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('canvas'); // 'canvas' | 'prompts'

  // Editable overlay cards
  const [hookText, setHookText] = useState(scriptData?.hookText || 'แกรรร! ไอเทมลับบอกต่อ');
  const [highlightText, setHighlightText] = useState(scriptData?.highlightText || 'ลดพิเศษ โคตรคุ้ม ดีย์มาก');
  const [priceText, setPriceText] = useState(scriptData?.priceText || product?.currentPrice || '฿299');
  const [discountText, setDiscountText] = useState(scriptData?.discountText || product?.discount || 'ลดพิเศษ');
  const [ctaText, setCtaText] = useState(scriptData?.ctaText || 'จิ้มตะกร้าเหลืองด่วน!');
  const [voiceoverText, setVoiceoverText] = useState(scriptData?.voiceoverScript || '');

  // Custom microphone audio
  const [customAudioBuffer, setCustomAudioBuffer] = useState(null);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [micProgress, setMicProgress] = useState(0);

  // Keep state synced when scriptData changes from AI Chat
  useEffect(() => {
    if (scriptData) {
      if (scriptData.hookText) setHookText(scriptData.hookText);
      if (scriptData.highlightText) setHighlightText(scriptData.highlightText);
      if (scriptData.priceText) setPriceText(scriptData.priceText);
      if (scriptData.discountText) setDiscountText(scriptData.discountText);
      if (scriptData.ctaText) setCtaText(scriptData.ctaText);
      if (scriptData.voiceoverScript) setVoiceoverText(scriptData.voiceoverScript);
    }
  }, [scriptData]);

  // Initialize Canvas Video Engine
  useEffect(() => {
    if (canvasRef.current) {
      engineRef.current = new CanvasVideoEngine(canvasRef.current);
      
      const imagesToLoad = selectedImages && selectedImages.length > 0 
        ? selectedImages 
        : product?.images || [];

      if (imagesToLoad.length > 0) {
        engineRef.current.loadImages(imagesToLoad).then(() => {
          engineRef.current.renderFrame(0, {
            hookText,
            highlightText,
            priceText,
            discountText,
            ctaText,
            title: product?.title || ''
          });
        });
      } else {
        engineRef.current.renderFrame(0, {
          hookText,
          highlightText,
          priceText,
          discountText,
          ctaText,
          title: product?.title || ''
        });
      }
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
      TTSEngine.stop();
    };
  }, [product, selectedImages]);

  // Re-render frame 0 whenever text values change
  useEffect(() => {
    if (engineRef.current && !isPlaying && !isExporting) {
      engineRef.current.renderFrame(0, {
        hookText,
        highlightText,
        priceText,
        discountText,
        ctaText,
        title: product?.title || ''
      });
    }
  }, [hookText, highlightText, priceText, discountText, ctaText]);

  const handlePlayPreview = () => {
    if (!engineRef.current) return;

    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
      setSpeaking(false);
    } else {
      setIsPlaying(true);
      setProgress(0);
      setSpeaking(true);

      engineRef.current.playPreview(
        {
          hookText,
          highlightText,
          priceText,
          discountText,
          ctaText,
          voiceoverText,
          customAudioBuffer,
          settings,
          title: product?.title || ''
        },
        (prog) => setProgress(prog),
        () => {
          setIsPlaying(false);
          setProgress(1.0);
          setSpeaking(false);
        }
      );
    }
  };

  const handleExportVideo = async () => {
    if (!engineRef.current) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      const blob = await engineRef.current.exportVideo(
        {
          hookText,
          highlightText,
          priceText,
          discountText,
          ctaText,
          voiceoverText,
          customAudioBuffer,
          settings,
          title: product?.title || ''
        },
        (prog) => setExportProgress(prog)
      );

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      // Trigger instant download
      const cleanTitle = (product?.title || 'shopee_product')
        .replace(/[^a-zA-Z0-9ก-๙]/g, '_')
        .slice(0, 30);
      const filename = `${cleanTitle}_8s_video.webm`;

      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'DOWNLOAD_FILE',
          url: url,
          filename: filename
        });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกวิดีโอ: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRecordMic = async () => {
    setIsRecordingMic(true);
    setMicProgress(0);

    try {
      const result = await TTSEngine.recordMicrophone(8.0, (p) => {
        setMicProgress(p);
      });
      result.buffer.__isRecorded = true;
      setCustomAudioBuffer(result.buffer);
    } catch (err) {
      alert('ไม่สามารถอัดเสียงได้: ' + err.message);
    } finally {
      setIsRecordingMic(false);
    }
  };

  const handleTestHearVoice = async () => {
    if (speaking) {
      TTSEngine.stop();
      setSpeaking(false);
      return;
    }

    if (customAudioBuffer) {
      setSpeaking(true);
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const src = ctx.createBufferSource();
      src.buffer = customAudioBuffer;
      src.connect(ctx.destination);
      src.onended = () => setSpeaking(false);
      src.start();
    } else if (voiceoverText) {
      setSpeaking(true);
      try {
        await TTSEngine.speak(voiceoverText, {
          settings,
          rate: settings.ttsRate || 1.2
        });
      } finally {
        setSpeaking(false);
      }
    }
  };

  return (
    <div className="p-3 space-y-3.5 pb-12">
      {/* Subtab Toggle (In-Browser 8s Video vs AI Prompts) */}
      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('canvas')}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'canvas' ? 'bg-white text-shopee-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>สร้างวิดีโอ 8s ทันที (Canvas)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('prompts')}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'prompts' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Prompts (Kling/Runway)</span>
        </button>
      </div>

      {activeSubTab === 'canvas' ? (
        <div className="space-y-3">
          {/* 9:16 Video Canvas Preview Container */}
          <div className="bg-slate-900 rounded-2xl p-2.5 shadow-md flex flex-col items-center">
            <div className="relative w-[210px] h-[373px] bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />

              {/* Progress Bar Overlay */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-black/40">
                <div 
                  className="h-full bg-shopee-primary transition-all duration-100"
                  style={{ width: `${(isPlaying ? progress : 0) * 100}%` }}
                />
              </div>

              {/* 8s Badge Indicator */}
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-yellow-400 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                {isPlaying ? `${(progress * 8.0).toFixed(1)}s / 8.0s` : '8.0s Fast Loop'}
              </div>
            </div>

            {/* Playback Controls Bar */}
            <div className="w-full flex items-center justify-between mt-2.5 px-2">
              <button
                onClick={handlePlayPreview}
                disabled={isExporting || isRecordingMic}
                className="flex items-center gap-1.5 bg-shopee-primary hover:bg-shopee-hover active:scale-95 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all"
              >
                {isPlaying ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                <span>{isPlaying ? 'หยุดพรีวิว' : 'พรีวิว 8 วินาที'}</span>
              </button>

              <button
                onClick={handleTestHearVoice}
                disabled={isRecordingMic || (!voiceoverText && !customAudioBuffer)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  speaking 
                    ? 'bg-amber-50 border-amber-300 text-amber-800' 
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Volume2 className="w-3 h-3" />
                <span>{speaking ? 'หยุดเสียง' : customAudioBuffer ? 'ฟังเสียงที่คุณอัด' : 'ฟังเสียงพากย์'}</span>
              </button>
            </div>
          </div>

          {/* Export Action Card */}
          <div className="bg-gradient-to-r from-orange-500 to-shopee-primary rounded-xl p-3 text-white shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs">เรนเดอร์วิดีโอ 8 วินาที สำเร็จรูป</h4>
                <p className="text-[11px] text-orange-100">มีเสียงพากย์ไทย + เพลง BGM ฝังในคลิป</p>
              </div>
              <button
                onClick={handleExportVideo}
                disabled={isExporting || isPlaying || isRecordingMic}
                className="flex items-center gap-1.5 bg-white text-shopee-primary hover:bg-orange-50 active:scale-95 px-3.5 py-2 rounded-lg font-bold text-xs shadow-md transition-all disabled:opacity-75"
              >
                <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
                <span>{isExporting ? `เรนเดอร์ ${(exportProgress * 100).toFixed(0)}%` : 'ดาวน์โหลดวิดีโอ 8s'}</span>
              </button>
            </div>

            {isExporting && (
              <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-yellow-300 h-full transition-all duration-150"
                  style={{ width: `${exportProgress * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Voiceover & Audio Options Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-shopee-primary" />
                <span>เสียงพากย์ (Voiceover)</span>
              </span>

              {/* Status Badge */}
              {customAudioBuffer ? (
                <span className="bg-green-100 text-green-800 font-semibold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  🎙️ ใช้เสียงพูดของคุณเอง
                </span>
              ) : settings.voiceEngine === 'openai' && settings.openaiApiKey ? (
                <span className="bg-purple-100 text-purple-800 font-semibold text-[10px] px-2 py-0.5 rounded-full">
                  ✨ OpenAI Nova (มีชีวิตชีวา)
                </span>
              ) : (
                <span className="bg-orange-100 text-orange-800 font-semibold text-[10px] px-2 py-0.5 rounded-full">
                  🔊 Google Thai (Fast 1.2x)
                </span>
              )}
            </div>

            {/* Mic Record Button */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-[11px] text-slate-800">อัดเสียงพูดของคุณเอง (8 วินาที)</h5>
                  <p className="text-[10px] text-slate-500">พูดสไตล์คุณเองได้อย่างมีชีวิตชีวาและเป็นธรรมชาติที่สุด</p>
                </div>

                {customAudioBuffer ? (
                  <button
                    onClick={() => setCustomAudioBuffer(null)}
                    className="flex items-center gap-1 text-[10px] text-red-600 hover:text-red-700 font-semibold bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ลบเสียงอัด</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRecordMic}
                    disabled={isRecordingMic}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                      isRecordingMic 
                        ? 'bg-red-600 text-white animate-pulse' 
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isRecordingMic ? `กำลังอัด ${(micProgress * 8.0).toFixed(1)}s` : 'กดอัดเสียง 8 วิ'}</span>
                  </button>
                )}
              </div>

              {isRecordingMic && (
                <div className="space-y-1">
                  <div className="w-full bg-red-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-red-600 h-full transition-all duration-100"
                      style={{ width: `${micProgress * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-red-600 font-medium text-center animate-pulse">
                    🎙️ กำลังบันทึกเสียง... พูดบทพากย์ของคุณได้เลย!
                  </p>
                </div>
              )}
            </div>

            {/* Script Textarea for AI Voice */}
            {!customAudioBuffer && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                  <span>บทพูดพากย์ AI สไตล์เม้าท์มอยป้ายยา</span>
                  <span className="text-[10px] text-slate-400">18-24 คำ (จบใน 8s)</span>
                </label>
                <textarea
                  value={voiceoverText}
                  onChange={(e) => setVoiceoverText(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-shopee-primary resize-none"
                  placeholder="แกรรร! อย่าเพิ่งเลื่อนผ่าน ตัวนี้คือดีย์มากกก..."
                />
              </div>
            )}
          </div>

          {/* Text Overlays Editor */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 shadow-sm">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-shopee-primary" />
              <span>ปรับแต่งข้อความบนจอ (3 ฉากใน 8 วินาที)</span>
            </span>

            {/* Scene 1: Hook */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                <span>ฉากที่ 1 (วินาที 0-2.6): ข้อความ Hook หยุดนิ้ว</span>
                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-mono">0.0s - 2.6s</span>
              </label>
              <input
                type="text"
                value={hookText}
                onChange={(e) => setHookText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-shopee-primary"
                placeholder="แกรรร สิ่งนี้ช่วยชีวิตมาก!"
              />
            </div>

            {/* Scene 2: Highlight & Price */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                <span>ฉากที่ 2 (วินาที 2.6-5.5): จุดเด่นสินค้า & ราคา</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded font-mono">2.6s - 5.5s</span>
              </label>
              <input
                type="text"
                value={highlightText}
                onChange={(e) => setHighlightText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-shopee-primary"
                placeholder="ของแท้ ลดพิเศษ โคตรคุ้ม"
              />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="text"
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-shopee-primary"
                  placeholder="ราคา เช่น ฿299"
                />
                <input
                  type="text"
                  value={discountText}
                  onChange={(e) => setDiscountText(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-shopee-primary"
                  placeholder="ป้ายลด เช่น ลด 50%"
                />
              </div>
            </div>

            {/* Scene 3: Fast CTA */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                <span>ฉากที่ 3 (วินาที 5.5-8.0): Call To Action ด่วน</span>
                <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.2 rounded font-mono">5.5s - 8.0s</span>
              </label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-shopee-primary"
                placeholder="จิ้มตะกร้าเหลืองซ้ายล่างด่วน!"
              />
            </div>
          </div>
        </div>
      ) : (
        /* AI Prompts Tab */
        <div className="space-y-3">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-purple-950 space-y-2">
            <h4 className="font-bold text-xs flex items-center gap-1.5 text-purple-800">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Storyboard & Prompts สำหรับ 8s AI Video</span>
            </h4>
            <p className="text-[11px] text-purple-700 leading-relaxed">
              สำหรับผู้ที่ต้องการนำภาพและ Prompt ไปเจนวิดีโอคุณภาพสูงระดับภาพยนตร์ใน <b>Kling AI</b> หรือ <b>Runway Gen-3</b>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">ฉากที่ 1: Close-up Glamour (0-4s)</span>
              <button
                onClick={() => {
                  const prompt = `Close-up cinematic commercial shot of ${product?.title || 'product'}, studio lighting, 8k resolution, elegant rotating display, commercial photography, depth of field --ar 9:16`;
                  navigator.clipboard.writeText(prompt);
                  alert('คัดลอก Prompt ฉาก 1 แล้ว!');
                }}
                className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold"
              >
                คัดลอก Prompt
              </button>
            </div>
            <p className="text-xs bg-slate-50 p-2 rounded-lg font-mono text-slate-700 border border-slate-200">
              Close-up cinematic commercial shot of {product?.title?.slice(0, 40) || 'product'}, studio lighting, 8k resolution, elegant rotating display, commercial photography, depth of field --ar 9:16
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">ฉากที่ 2: In-use Showcase (4-8s)</span>
              <button
                onClick={() => {
                  const prompt = `Dynamic handheld shot showcasing ${product?.title || 'product'} in everyday lifestyle context, smiling person interacting, bright daylight, authentic TikTok review vibe --ar 9:16`;
                  navigator.clipboard.writeText(prompt);
                  alert('คัดลอก Prompt ฉาก 2 แล้ว!');
                }}
                className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold"
              >
                คัดลอก Prompt
              </button>
            </div>
            <p className="text-xs bg-slate-50 p-2 rounded-lg font-mono text-slate-700 border border-slate-200">
              Dynamic handheld shot showcasing {product?.title?.slice(0, 40) || 'product'} in everyday lifestyle context, smiling person interacting, bright daylight, authentic TikTok review vibe --ar 9:16
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
