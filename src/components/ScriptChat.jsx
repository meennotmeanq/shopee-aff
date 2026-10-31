import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Send, Copy, Check, Volume2, ArrowRight, 
  Flame, Zap, Film, RefreshCw, Bot, User, AlertCircle 
} from 'lucide-react';
import { generateProductScript, chatWithAI, parseScriptJSON } from '../services/aiService';
import { TTSEngine } from '../utils/ttsEngine';

export default function ScriptChat({ 
  product, 
  settings, 
  onApplyToVideoStudio,
  onOpenSettings 
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const hasApiKey = (settings.aiProvider === 'gemini' && settings.geminiApiKey) ||
                    (settings.aiProvider === 'openai' && settings.openaiApiKey);

  const handleGenerateTemplate = async (templateType) => {
    if (!product) {
      setError('กรุณาดึงข้อมูลสินค้าจาก Shopee ก่อน');
      return;
    }
    if (!hasApiKey) {
      setError('กรุณาใส่ API Key ในแท็บการตั้งค่า (Settings) ก่อนใช้งาน AI');
      return;
    }

    setError('');
    setLoading(true);

    const userMsg = {
      role: 'user',
      content: templateType === '8s-viral' 
        ? 'ขอสคริปต์วิดีโอ 8 วินาที สูตร Viral Loop ดันยอดดูจบ 100%' 
        : templateType === '8s-flashsale' 
          ? 'ขอสคริปต์วิดีโอ 8 วินาที สไตล์ Flash Sale เร่งด่วนป้ายยา' 
          : 'ขอ Storyboard & Prompts สำหรับเจนวิดีโอ 8 วินาที ด้วย Kling/Runway'
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await generateProductScript(product, templateType, settings);
      const parsedData = parseScriptJSON(response);

      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: response,
          parsedData: parsedData
        }
      ]);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเรียก AI');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;

    if (!hasApiKey) {
      setError('กรุณาใส่ API Key ในแท็บการตั้งค่า (Settings) ก่อนใช้งาน AI');
      return;
    }

    const newMsg = { role: 'user', content: inputText.trim() };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInputText('');
    setLoading(true);
    setError('');

    try {
      const reply = await chatWithAI(updatedMessages, product, settings);
      const parsedData = parseScriptJSON(reply);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          parsedData: parsedData
        }
      ]);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเรียก AI');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSpeak = (text, idx) => {
    if (speakingIndex === idx) {
      TTSEngine.stop();
      setSpeakingIndex(null);
    } else {
      setSpeakingIndex(idx);
      TTSEngine.speak(text, {
        rate: settings.ttsRate || 1.15,
        pitch: settings.ttsPitch || 1.0
      }).then(() => {
        setSpeakingIndex(null);
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-85px)] bg-slate-50">
      {/* Top Quick Actions Bar */}
      <div className="p-3 bg-white border-b border-slate-200 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-shopee-primary" />
            <span>เทมเพลตสคริปต์ 8 วินาที (1-Click)</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {settings.aiProvider === 'gemini' ? (settings.geminiModel || 'Gemini 3.8') : 'OpenAI'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => handleGenerateTemplate('8s-viral')}
            disabled={loading || !product}
            className="flex items-center justify-center gap-1 p-2 bg-gradient-to-b from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200 rounded-lg text-slate-800 text-[11px] font-semibold transition-all disabled:opacity-50 text-center"
          >
            <Flame className="w-3.5 h-3.5 text-shopee-primary shrink-0" />
            <span>8s Viral Loop</span>
          </button>

          <button
            onClick={() => handleGenerateTemplate('8s-flashsale')}
            disabled={loading || !product}
            className="flex items-center justify-center gap-1 p-2 bg-gradient-to-b from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 border border-red-200 rounded-lg text-slate-800 text-[11px] font-semibold transition-all disabled:opacity-50 text-center"
          >
            <Zap className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>8s Flash Sale</span>
          </button>

          <button
            onClick={() => handleGenerateTemplate('prompts-kling')}
            disabled={loading || !product}
            className="flex items-center justify-center gap-1 p-2 bg-gradient-to-b from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 rounded-lg text-slate-800 text-[11px] font-semibold transition-all disabled:opacity-50 text-center"
          >
            <Film className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>AI Prompts</span>
          </button>
        </div>

        {!hasApiKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-800 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              ยังไม่ได้ระบุ API Key
            </span>
            <button
              onClick={onOpenSettings}
              className="text-shopee-primary font-bold hover:underline"
            >
              ตั้งค่า Key ที่นี่
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-[11px] text-red-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {messages.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-shopee-primary mx-auto flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-700">AI พร้อมคิดสคริปต์ 8 วินาที</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[280px] mx-auto">
                กดปุ่มสูตรด้านบน หรือพิมพ์บอกความต้องการ เช่น <br />
                <i className="text-slate-600">"ขอสคริปต์ 8 วิ เน้นกลุ่มวัยรุ่น สายประหยัด"</i>
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-shopee-primary to-orange-400 text-white flex items-center justify-center shrink-0 text-xs shadow-sm mt-1">
                  AI
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-shopee-primary text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                }`}
              >
                {/* Assistant Message Body */}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Structured 8s Video Card if parsed successfully */}
                {msg.parsedData && (
                  <div className="mt-3 pt-3 border-t border-slate-100 bg-orange-50/70 rounded-xl p-2.5 border border-orange-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-orange-950 flex items-center gap-1">
                        🎬 โครงสร้างวิดีโอ 8 วินาที
                      </span>
                      <button
                        onClick={() => onApplyToVideoStudio(msg.parsedData)}
                        className="bg-shopee-primary hover:bg-shopee-hover active:scale-95 text-white font-bold text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm transition-all"
                      >
                        <span>ส่งเข้า Video Studio</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex gap-1.5">
                        <span className="text-slate-400 font-mono shrink-0">0-2s:</span>
                        <span className="font-semibold text-slate-800">{msg.parsedData.hookText}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="text-slate-400 font-mono shrink-0">2-6s:</span>
                        <span className="text-slate-700">{msg.parsedData.highlightText} ({msg.parsedData.priceText})</span>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="text-slate-400 font-mono shrink-0">6-8s:</span>
                        <span className="text-shopee-primary font-semibold">{msg.parsedData.ctaText}</span>
                      </div>
                    </div>

                    {msg.parsedData.voiceoverScript && (
                      <div className="pt-1.5 border-t border-orange-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">เสียงพากย์ 8s:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSpeak(msg.parsedData.voiceoverScript, `voice-${idx}`)}
                            className="text-shopee-primary hover:text-orange-700 flex items-center gap-1 text-[10px] font-medium"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{speakingIndex === `voice-${idx}` ? 'หยุดฟัง' : 'ลองฟังเสียง'}</span>
                          </button>
                          <button
                            onClick={() => handleCopyText(msg.parsedData.voiceoverScript, `copy-v-${idx}`)}
                            className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-[10px]"
                          >
                            {copiedIndex === `copy-v-${idx}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            <span>คัดลอกบท</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Actions */}
                <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-slate-400">
                  <button
                    onClick={() => handleCopyText(msg.content, idx)}
                    className="hover:text-slate-600 flex items-center gap-0.5"
                  >
                    {copiedIndex === idx ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === idx ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                  </button>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs mt-1">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-2 items-center text-slate-500 text-xs py-2">
            <div className="w-7 h-7 rounded-full bg-shopee-primary text-white flex items-center justify-center text-xs animate-pulse">
              AI
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
              <RefreshCw className="w-3.5 h-3.5 text-shopee-primary animate-spin" />
              <span>กำลังคิดบทสคริปต์ 8 วินาที...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Chat Box */}
      <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-slate-200 shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-shopee-primary/30 focus-within:bg-white border border-slate-200">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="พิมพ์บอก AI เช่น ขอปรับสำนวนให้ตลก กวนๆ..."
            className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-7 h-7 rounded-lg bg-shopee-primary hover:bg-shopee-hover active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

