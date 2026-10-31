import React, { useState } from 'react';
import { 
  Key, ShieldCheck, Check, Save, ExternalLink, 
  HelpCircle, Sparkles, RefreshCw, AlertCircle, Volume2, Mic 
} from 'lucide-react';
import { callGemini } from '../services/gemini';
import { callOpenAI } from '../services/openai';
import { TTSEngine } from '../utils/ttsEngine';

export default function SettingsTab({ settings, onSave }) {
  const [formData, setFormData] = useState({ ...settings });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
    setTestResult(null);
  };

  const handleSave = () => {
    onSave(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      if (formData.aiProvider === 'gemini') {
        if (!formData.geminiApiKey) {
          throw new Error('กรุณาระบุ Gemini API Key ก่อนทดสอบ');
        }
        await callGemini({
          apiKey: formData.geminiApiKey,
          model: formData.geminiModel || 'gemini-3.8-flash',
          prompt: 'ตอบว่า "OK" คำเดียวสั้นๆ'
        });
      } else {
        if (!formData.openaiApiKey) {
          throw new Error('กรุณาระบุ OpenAI API Key ก่อนทดสอบ');
        }
        await callOpenAI({
          apiKey: formData.openaiApiKey,
          model: formData.openaiModel || 'gpt-4o-mini',
          prompt: 'ตอบว่า "OK" คำเดียวสั้นๆ'
        });
      }

      setTestResult({ success: true, message: 'เชื่อมต่อ AI API สำเร็จเรียบร้อย! ใช้งานได้เลย' });
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'การเชื่อมต่อล้มเหลว' });
    } finally {
      setTesting(false);
    }
  };

  const handleTestVoice = async () => {
    setTestingVoice(true);
    try {
      await TTSEngine.speak('แกรรร! อย่าเพิ่งเลื่อนผ่านนะ ตัวนี้คือดีย์มากกก โคตรคุ้ม!', {
        settings: formData,
        rate: formData.ttsRate || 1.2
      });
    } catch (e) {
      alert('ทดสอบเสียงไม่สำเร็จ: ' + e.message);
    } finally {
      setTestingVoice(false);
    }
  };

  return (
    <div className="p-3.5 space-y-4 pb-12">
      {/* Title */}
      <div>
        <h2 className="font-bold text-sm text-slate-800">การตั้งค่า (Settings)</h2>
        <p className="text-[11px] text-slate-500">จัดการ AI API Key, เสียงพากย์ และ Shopee Sub ID</p>
      </div>

      {/* Voice Engine Settings Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3 shadow-sm">
        <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-shopee-primary" />
            <span>ระบบเสียงพากย์วิดีโอ (Voice Engine)</span>
          </span>
          <button
            type="button"
            onClick={handleTestVoice}
            disabled={testingVoice}
            className="text-[10px] text-shopee-primary font-bold hover:underline flex items-center gap-1"
          >
            <Volume2 className="w-2.5 h-2.5" />
            <span>{testingVoice ? 'กำลังพูด...' : 'ทดสอบเสียงพากย์'}</span>
          </button>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleChange('voiceEngine', 'openai')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              formData.voiceEngine === 'openai'
                ? 'border-shopee-primary bg-orange-50/60 ring-2 ring-orange-200'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50'
            }`}
          >
            <div className="font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>OpenAI Neural</span>
              {formData.voiceEngine === 'openai' && <Check className="w-3 h-3 text-shopee-primary" />}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">สมจริง มีชีวิตชีวา สไตล์ TikTok</p>
          </button>

          <button
            type="button"
            onClick={() => handleChange('voiceEngine', 'google')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              formData.voiceEngine === 'google'
                ? 'border-shopee-primary bg-orange-50/60 ring-2 ring-orange-200'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50'
            }`}
          >
            <div className="font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>Google Thai Fast</span>
              {formData.voiceEngine === 'google' && <Check className="w-3 h-3 text-shopee-primary" />}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">ฟรีในตัว ไม่ต้องใช้ API Key</p>
          </button>
        </div>

        {formData.voiceEngine === 'openai' && (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">เลือกคาแรคเตอร์เสียง (OpenAI Voice)</label>
              <select
                value={formData.openaiVoice || 'nova'}
                onChange={(e) => handleChange('openaiVoice', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-shopee-primary"
              >
                <option value="nova">Nova (หญิงสดใส พลังงานสูง แนะนำสำหรับ TikTok Creator)</option>
                <option value="alloy">Alloy (ธรรมชาติ มั่นใจ เป็นกลาง)</option>
                <option value="shimmer">Shimmer (หญิงนุ่มนวล น่าฟัง มีเสน่ห์)</option>
                <option value="fable">Fable (สนุกสนาน เล่าเรื่องเก่ง)</option>
                <option value="onyx">Onyx (ชายทุ้ม อบอุ่น น่าเชื่อถือ)</option>
              </select>
            </div>
          </div>
        )}

        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span>ความเร็วจังหวะการพูด (Speech Rate)</span>
            <span className="text-shopee-primary font-mono">{formData.ttsRate || 1.2}x</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="1.4"
            step="0.05"
            value={formData.ttsRate || 1.2}
            onChange={(e) => handleChange('ttsRate', parseFloat(e.target.value))}
            className="w-full accent-shopee-primary cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>ปกติ (1.0x)</span>
            <span>แนะนำสำหรับคลิป 8 วิ (1.2x)</span>
            <span>กระชับเร็ว (1.4x)</span>
          </div>
        </div>
      </div>

      {/* AI Provider Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3 shadow-sm">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-shopee-primary" />
          <span>เลือก AI สำหรับคิดบท (Script Provider)</span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleChange('aiProvider', 'gemini')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              formData.aiProvider === 'gemini'
                ? 'border-shopee-primary bg-orange-50/60 ring-2 ring-orange-200'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50'
            }`}
          >
            <div className="font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>Google Gemini</span>
              {formData.aiProvider === 'gemini' && <Check className="w-3 h-3 text-shopee-primary" />}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Gemini 3.8 Flash แนะนำ</p>
          </button>

          <button
            type="button"
            onClick={() => handleChange('aiProvider', 'openai')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              formData.aiProvider === 'openai'
                ? 'border-shopee-primary bg-orange-50/60 ring-2 ring-orange-200'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50'
            }`}
          >
            <div className="font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>OpenAI</span>
              {formData.aiProvider === 'openai' && <Check className="w-3 h-3 text-shopee-primary" />}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">GPT-4o / GPT-4o-mini</p>
          </button>
        </div>

        {/* Gemini Settings */}
        {formData.aiProvider === 'gemini' && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <Key className="w-3 h-3 text-slate-400" />
                  <span>Gemini API Key</span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-shopee-primary hover:underline flex items-center gap-0.5"
                >
                  <span>ขอคีย์ฟรีที่นี่</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <input
                type="password"
                value={formData.geminiApiKey || ''}
                onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-shopee-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">รุ่นโมเดล (Gemini Model)</label>
              <select
                value={formData.geminiModel || 'gemini-3.8-flash'}
                onChange={(e) => handleChange('geminiModel', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-shopee-primary"
              >
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (แนะนำล่าสุด)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </select>
            </div>
          </div>
        )}

        {/* OpenAI Settings */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <Key className="w-3 h-3 text-slate-400" />
                <span>OpenAI API Key (สำหรับเสียง Neural หรือคิดบท)</span>
              </label>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-shopee-primary hover:underline flex items-center gap-0.5"
              >
                <span>รับคีย์</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <input
              type="password"
              value={formData.openaiApiKey || ''}
              onChange={(e) => handleChange('openaiApiKey', e.target.value)}
              placeholder="sk-..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-shopee-primary"
            />
          </div>
        </div>

        {/* Test Connection Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-98 rounded-lg text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ API'}</span>
          </button>

          {testResult && (
            <div className={`mt-2 p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
              testResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {testResult.success ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Shopee Affiliate Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 shadow-sm">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-shopee-primary" />
          <span>Shopee Affiliate Sub ID</span>
        </label>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600">
            Sub_ID หรือ Tracking Tag ของคุณ
          </label>
          <input
            type="text"
            value={formData.affiliateSubId || ''}
            onChange={(e) => handleChange('affiliateSubId', e.target.value)}
            placeholder="เช่น tiktok_creator_01"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-shopee-primary"
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full py-2.5 bg-shopee-primary hover:bg-shopee-hover active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all"
      >
        {savedSuccess ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
        <span>{savedSuccess ? 'บันทึกการตั้งค่าเรียบร้อยแล้ว!' : 'บันทึกการตั้งค่า'}</span>
      </button>
    </div>
  );
}
