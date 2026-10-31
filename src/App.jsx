import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ProductViewer from './components/ProductViewer';
import ShopViewer from './components/ShopViewer';
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

const SAMPLE_SHOP = {
  shopId: '12345678',
  shopName: 'Official Gadget Store',
  avatar: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&auto=format&fit=crop&q=80',
  rating: 4.9,
  itemCount: 148,
  followerCount: 52400,
  isOfficial: true,
  products: [
    {
      itemId: '98765432',
      shopId: '12345678',
      title: 'พัดลมพกพาไร้สาย พลังลมแรง 5 ระดับ แบตเตอรี่อึด 5000mAh พับเก็บได้',
      currentPrice: '฿249',
      originalPrice: '฿590',
      discount: '-58%',
      rating: 4.9,
      soldCount: '15.4k+',
      imageUrl: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'
      ],
      url: 'https://shopee.co.th/product/12345678/98765432'
    },
    {
      itemId: '98765433',
      shopId: '12345678',
      title: 'หูฟังบลูทูธไร้สาย ANC ตัดเสียงรบกวน เบสแน่น แบตเตอรี่ 40 ชม.',
      currentPrice: '฿890',
      originalPrice: '฿1,590',
      discount: '-44%',
      rating: 4.8,
      soldCount: '8.2k+',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
      ],
      url: 'https://shopee.co.th/product/12345678/98765433'
    },
    {
      itemId: '98765434',
      shopId: '12345678',
      title: 'พาวเวอร์แบงค์ชาร์จไว 20000mAh PD 22.5W มีหน้าจอดิจิทัล น้ำหนักเบา',
      currentPrice: '฿459',
      originalPrice: '฿890',
      discount: '-48%',
      rating: 4.9,
      soldCount: '21.5k+',
      imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'
      ],
      url: 'https://shopee.co.th/product/12345678/98765434'
    },
    {
      itemId: '98765435',
      shopId: '12345678',
      title: 'ขาตั้งมือถือไอแพด อลูมิเนียมแท้ ปรับมุมได้ 360 องศา แข็งแรง ทนทาน',
      currentPrice: '฿139',
      originalPrice: '฿299',
      discount: '-53%',
      rating: 4.7,
      soldCount: '5.1k+',
      imageUrl: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&auto=format&fit=crop&q=80'
      ],
      url: 'https://shopee.co.th/product/12345678/98765435'
    }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('product');
  const [viewMode, setViewMode] = useState('product'); // 'product' | 'shop'
  const [product, setProduct] = useState(null);
  const [shop, setShop] = useState(null);
  const [shopSortBy, setShopSortBy] = useState('pop');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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

  // Helper to send message to active tab with auto-injection
  const sendTabMessage = async (tabId, message) => {
    try {
      return await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (res) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(res);
          }
        });
      });
    } catch (msgErr) {
      // Content script was not injected yet; inject and retry
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });

      return await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (res) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(res);
          }
        });
      });
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

        const activeTabObj = tabs?.[0];
        if (!activeTabObj || !activeTabObj.id) {
          throw new Error('ไม่พบแท็บที่กำลังเปิดอยู่');
        }

        const tabUrl = activeTabObj.url || '';
        if (!tabUrl.includes('shopee.co.th') && !tabUrl.includes('shopeemobile.com')) {
          throw new Error('หน้านี้ไม่ใช่หน้า Shopee กรุณาเปิดหน้าสินค้าหรือหน้าร้านค้า shopee.co.th ก่อน');
        }

        // 1. Detect page type
        let pageType = 'UNKNOWN';
        try {
          const detectRes = await sendTabMessage(activeTabObj.id, { action: 'DETECT_PAGE_TYPE' });
          if (detectRes?.success && detectRes.pageInfo?.type) {
            pageType = detectRes.pageInfo.type;
          }
        } catch (e) {
          // If detection fails, fall back to checking URL
          if (tabUrl.includes('-i.') || tabUrl.includes('/product/')) {
            pageType = 'PRODUCT';
          } else {
            pageType = 'SHOP';
          }
        }

        // 2. Branch: Shop Page vs Single Product
        if (pageType === 'SHOP') {
          const shopRes = await sendTabMessage(activeTabObj.id, { 
            action: 'SCRAPE_SHOP',
            options: { limit: 30, offset: 0, sortBy: shopSortBy }
          });

          if (shopRes && shopRes.success && shopRes.shop) {
            setShop(shopRes.shop);
            setViewMode('shop');
          } else {
            throw new Error(shopRes?.error || 'ไม่สามารถดึงข้อมูลร้านค้าได้');
          }
        } else {
          // Single Product Mode
          const prodRes = await sendTabMessage(activeTabObj.id, { action: 'SCRAPE_PRODUCT' });

          if (prodRes && prodRes.success && prodRes.product) {
            setProduct(prodRes.product);
            setSelectedImages(prodRes.product.images.slice(0, 4));
            const subId = settings?.affiliateSubId || '';
            setAffiliateUrl(generateAffiliateUrl(prodRes.product.url, subId));
            setViewMode('product');
          } else {
            // If product scraper failed, attempt shop scraper as fallback
            const shopFallback = await sendTabMessage(activeTabObj.id, { 
              action: 'SCRAPE_SHOP',
              options: { limit: 30, offset: 0, sortBy: shopSortBy }
            });
            if (shopFallback && shopFallback.success && shopFallback.shop) {
              setShop(shopFallback.shop);
              setViewMode('shop');
            } else {
              throw new Error(prodRes?.error || 'ไม่สามารถดึงข้อมูลจากหน้านี้ได้');
            }
          }
        }
      } catch (err) {
        setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      } finally {
        setLoading(false);
      }
    } else {
      // Standalone browser preview: load mock product and mock shop
      setTimeout(() => {
        setProduct(SAMPLE_PRODUCT);
        setShop(SAMPLE_SHOP);
        setSelectedImages(SAMPLE_PRODUCT.images.slice(0, 3));
        setAffiliateUrl(generateAffiliateUrl(SAMPLE_PRODUCT.url, settings?.affiliateSubId || ''));
        setLoading(false);
      }, 600);
    }
  };

  // Load more shop products (Pagination +30)
  const handleLoadMoreShop = async () => {
    if (!shop || loadingMore) return;
    setLoadingMore(true);

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const tabs = await new Promise(resolve => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        const activeTabObj = tabs?.[0];
        if (!activeTabObj) return;

        const nextOffset = shop.products?.length || 0;
        const res = await sendTabMessage(activeTabObj.id, {
          action: 'SCRAPE_SHOP',
          options: { limit: 30, offset: nextOffset, sortBy: shopSortBy }
        });

        if (res && res.success && res.shop?.products) {
          setShop(prev => ({
            ...prev,
            products: [...(prev?.products || []), ...res.shop.products]
          }));
        }
      } catch (e) {
        console.error('Failed to load more products:', e);
      } finally {
        setLoadingMore(false);
      }
    } else {
      // Mock load more in browser preview
      setTimeout(() => {
        setShop(prev => ({
          ...prev,
          products: [
            ...(prev?.products || []),
            {
              itemId: `mock_${Date.now()}`,
              shopId: prev.shopId,
              title: `สินค้าเพิ่มเติมจากร้านค้า #${(prev?.products?.length || 0) + 1}`,
              currentPrice: '฿199',
              originalPrice: '฿390',
              discount: '-49%',
              rating: 4.8,
              soldCount: '1.2k',
              imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
              images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'],
              url: `https://shopee.co.th/product/${prev.shopId}/mock_${Date.now()}`
            }
          ]
        }));
        setLoadingMore(false);
      }, 500);
    }
  };

  // Change sort in Shop Viewer
  const handleChangeShopSort = async (newSort) => {
    setShopSortBy(newSort);
    setLoading(true);

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const tabs = await new Promise(resolve => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        const activeTabObj = tabs?.[0];
        if (!activeTabObj) return;

        const res = await sendTabMessage(activeTabObj.id, {
          action: 'SCRAPE_SHOP',
          options: { limit: 30, offset: 0, sortBy: newSort }
        });

        if (res && res.success && res.shop) {
          setShop(res.shop);
        }
      } catch (e) {
        console.error('Failed to sort products:', e);
      } finally {
        setLoading(false);
      }
    } else {
      setTimeout(() => setLoading(false), 300);
    }
  };

  // When user clicks "ทำคลิป 8s 🎬" or selects an item from ShopViewer
  const handleSelectProductFromShop = async (shopProduct) => {
    setLoading(true);
    setError('');

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const tabs = await new Promise(resolve => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        const activeTabObj = tabs?.[0];

        // Fetch deep product details
        let detailedProduct = null;
        if (activeTabObj && shopProduct.itemId) {
          try {
            const res = await sendTabMessage(activeTabObj.id, {
              action: 'SCRAPE_PRODUCT_BY_ID',
              shopId: shopProduct.shopId,
              itemId: shopProduct.itemId
            });
            if (res && res.success && res.product) {
              detailedProduct = res.product;
            }
          } catch (e) {
            console.warn('Could not fetch deep product detail, using shop item data:', e);
          }
        }

        const chosen = detailedProduct || {
          ...shopProduct,
          shopName: shop?.shopName || '',
          description: shopProduct.title,
          specifications: []
        };

        setProduct(chosen);
        setSelectedImages((chosen.images && chosen.images.length > 0) ? chosen.images.slice(0, 4) : [chosen.imageUrl]);
        setAffiliateUrl(generateAffiliateUrl(chosen.url, settings?.affiliateSubId || ''));
        setViewMode('product');
      } catch (err) {
        setError('ไม่สามารถโหลดรายละเอียดสินค้าได้');
      } finally {
        setLoading(false);
      }
    } else {
      // Standalone browser preview
      setProduct({
        ...shopProduct,
        shopName: shop?.shopName || 'Official Gadget Store',
        description: `${shopProduct.title} คุณภาพเกรดพรีเมียม รับประกันศูนย์ไทย`,
        specifications: [
          { name: 'การรับประกัน', value: '1 ปี' },
          { name: 'สภาพสินค้า', value: 'ของแท้ 100%' }
        ]
      });
      setSelectedImages(shopProduct.images || [shopProduct.imageUrl]);
      setAffiliateUrl(generateAffiliateUrl(shopProduct.url, settings?.affiliateSubId || ''));
      setViewMode('product');
      setLoading(false);
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
        hasShop={!!shop}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />

      <main className="flex-1">
        {activeTab === 'product' && (
          viewMode === 'shop' && shop ? (
            <ShopViewer
              shop={shop}
              loading={loading}
              error={error}
              onRefreshShop={handleExtractProduct}
              onLoadMore={handleLoadMoreShop}
              loadingMore={loadingMore}
              sortBy={shopSortBy}
              onChangeSort={handleChangeShopSort}
              onSelectProduct={handleSelectProductFromShop}
              affiliateSubId={settings?.affiliateSubId || ''}
              selectedProduct={product}
              onBackToSelectedProduct={() => setViewMode('product')}
            />
          ) : (
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
              hasShopData={!!shop}
              shopName={shop?.shopName}
              onSwitchToShop={() => setViewMode('shop')}
            />
          )
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
