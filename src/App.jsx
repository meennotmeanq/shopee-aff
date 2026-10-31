import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ProductViewer from './components/ProductViewer';
import ScriptChat from './components/ScriptChat';
import VideoStudio from './components/VideoStudio';
import SettingsTab from './components/SettingsTab';
import { getSettings, saveSettings } from './utils/storage';
import { generateAffiliateUrl } from './utils/affiliate';

// Sample mock data for preview outside extension environment
const SAMPLE_PRODUCT = {
  url: 'https://shopee.co.th/product/12345678/98765432',
  shopId: '12345678',
  itemId: '98765432',
  title: 'พัดลมพกพาไร้สาย พลังลมแรง 5 ระดับ แบตเตอรี่อึด 5000mAh พับเก็บได้ น้ำหนักเบา',
  currentPrice: '฿249',
  originalPrice: '฿590',
  discount: '-58%',
  rating: 4.9,
  soldCount: '15.4k+',
  shopName: 'Official Gadget Store',
  description: 'พัดลมพกพารุ่นใหม่ล่าสุด ปรับแรงลมได้ 5 ระดับ หน้าจอดิจิทัลแสดงผลแบตเตอรี่ เสียงเงียบ น้ำหนักเบาพกพาสะดวก',
  images: [
    'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('product');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(null);
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [scriptData, setScriptData] = useState(null);

  // Load settings on startup
  useEffect(() => {
    getSettings().then(saved => {
      setSettings(saved);
    });
  }, []);

  const handleSaveSettings = async (newSettings) => {
    await saveSettings(newSettings);
    setSettings(newSettings);
    if (product) {
      setAffiliateUrl(generateAffiliateUrl(product.url, newSettings.affiliateSubId));
    }
  };

  const handleExtractProduct = async () => {
    setLoading(true);
    setError('');

    // Check if running inside Chrome Extension
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const tabs = await new Promise(resolve => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });

        const activeTab = tabs?.[0];
        if (!activeTab || !activeTab.id) {
          throw new Error('ไม่พบแท็บที่กำลังเปิดอยู่');
        }

        const tabUrl = activeTab.url || '';
        if (!tabUrl.includes('shopee.co.th') && !tabUrl.includes('shopeemobile.com')) {
          throw new Error('หน้านี้ไม่ใช่หน้าสินค้า Shopee กรุณาเปิดหน้าสินค้า shopee.co.th ก่อน');
        }

        // Send scrape message to content script
        let response = null;
        try {
          response = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(activeTab.id, { action: 'SCRAPE_PRODUCT' }, (res) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(res);
              }
            });
          });
        } catch (msgErr) {
          // If content script was not injected, dynamically inject it and retry
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js']
          });

          response = await new Promise((resolve) => {
            chrome.tabs.sendMessage(activeTab.id, { action: 'SCRAPE_PRODUCT' }, resolve);
          });
        }

        if (response && response.success && response.product) {
          setProduct(response.product);
          setSelectedImages(response.product.images.slice(0, 4));
          const subId = settings?.affiliateSubId || '';
          setAffiliateUrl(generateAffiliateUrl(response.product.url, subId));
        } else {
          throw new Error(response?.error || 'ไม่สามารถดึงข้อมูลจากหน้านี้ได้');
        }
      } catch (err) {
        setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า');
      } finally {
        setLoading(false);
      }
    } else {
      // Standalone browser preview: load mock product
      setTimeout(() => {
        setProduct(SAMPLE_PRODUCT);
        setSelectedImages(SAMPLE_PRODUCT.images.slice(0, 3));
        setAffiliateUrl(generateAffiliateUrl(SAMPLE_PRODUCT.url, settings?.affiliateSubId || ''));
        setLoading(false);
      }, 600);
    }
  };

  const handleToggleImageSelect = (imgUrl) => {
    setSelectedImages(prev => {
      if (prev.includes(imgUrl)) {
        return prev.filter(url => url !== imgUrl);
      } else {
        if (prev.length >= 5) {
          alert('เลือกรูปภาพสำหรับวิดีโอ 8 วินาที ได้สูงสุด 5 รูป');
          return prev;
        }
        return [...prev, imgUrl];
      }
    });
  };

  const handleApplyToVideoStudio = (parsedData) => {
    setScriptData(parsedData);
    setActiveTab('video');
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 text-xs">
        กำลังโหลดการตั้งค่า...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        hasProduct={!!product} 
      />

      <main className="flex-1">
        {activeTab === 'product' && (
          <ProductViewer
            product={product}
            onExtract={handleExtractProduct}
            loading={loading}
            error={error}
            affiliateUrl={affiliateUrl}
            onAffiliateUrlChange={setAffiliateUrl}
            onProceedToScript={() => setActiveTab('script')}
            selectedImages={selectedImages}
            onToggleImageSelect={handleToggleImageSelect}
          />
        )}

        {activeTab === 'script' && (
          <ScriptChat
            product={product}
            settings={settings}
            onApplyToVideoStudio={handleApplyToVideoStudio}
            onOpenSettings={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'video' && (
          <VideoStudio
            product={product}
            selectedImages={selectedImages}
            scriptData={scriptData}
            settings={settings}
            onUpdateScriptData={setScriptData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onSave={handleSaveSettings}
          />
        )}
      </main>
    </div>
  );
}

