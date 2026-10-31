import React, { useState } from 'react';
import { 
  Download, Copy, Check, ExternalLink, RefreshCw, Star, 
  Sparkles, Tag, ShoppingCart, Image as ImageIcon, AlertCircle 
} from 'lucide-react';

export default function ProductViewer({ 
  product, 
  onExtract, 
  loading, 
  error, 
  affiliateUrl, 
  onAffiliateUrlChange,
  onProceedToScript,
  selectedImages,
  onToggleImageSelect
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);

  const handleCopyLink = () => {
    const url = affiliateUrl || product?.url;
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyTitle = () => {
    if (product?.title) {
      navigator.clipboard.writeText(product.title);
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    }
  };

  const handleDownloadImage = (imgUrl, index) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'DOWNLOAD_IMAGE',
        url: imgUrl,
        filename: `shopee_img_${index + 1}.jpg`
      });
    } else {
      // Fallback
      window.open(imgUrl, '_blank');
    }
  };

  const handleDownloadAllImages = () => {
    if (!product?.images) return;
    product.images.forEach((imgUrl, idx) => {
      setTimeout(() => {
        handleDownloadImage(imgUrl, idx);
      }, idx * 300);
    });
  };

  return (
    <div className="p-3.5 space-y-4">
      {/* Extract Button Card */}
      <div className="bg-gradient-to-r from-orange-500 to-shopee-primary rounded-xl p-3 text-white shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-bold text-sm">ดึงข้อมูลสินค้าจาก Shopee</h2>
            <p className="text-[11px] text-orange-100">เปิดหน้าสินค้า Shopee แล้วกดปุ่มนี้</p>
          </div>
          <button
            onClick={onExtract}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white text-shopee-primary hover:bg-orange-50 active:scale-95 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all disabled:opacity-70"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลทันที'}</span>
          </button>
        </div>

        {error && (
          <div className="mt-2 bg-red-500/20 border border-red-300/40 rounded-lg p-2 text-[11px] text-white flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Product Content Card */}
      {product ? (
        <div className="space-y-3">
          {/* Main Product Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-3">
            {/* Header: Title & Shop */}
            <div>
              {product.shopName && (
                <div className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">🏪 {product.shopName}</span>
                </div>
              )}
              <h3 className="font-semibold text-slate-800 text-xs leading-snug line-clamp-2">
                {product.title}
              </h3>
            </div>

            {/* Price & Rating Bar */}
            <div className="flex items-center justify-between bg-orange-50/70 border border-orange-100 rounded-lg p-2">
              <div className="flex items-baseline gap-2">
                <span className="text-shopee-primary font-bold text-lg leading-none">
                  {product.currentPrice || '฿--'}
                </span>
                {product.originalPrice && (
                  <span className="text-slate-400 text-xs line-through">
                    {product.originalPrice}
                  </span>
                )}
                {product.discount && (
                  <span className="bg-shopee-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {product.discount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                {product.rating > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {product.rating}
                  </span>
                )}
                {product.soldCount && (
                  <span className="text-slate-500">ขายแล้ว {product.soldCount}</span>
                )}
              </div>
            </div>

            {/* Image Gallery */}
            {product.images && product.images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>รูปภาพสินค้า ({product.images.length} รูป)</span>
                    <span className="text-[10px] font-normal text-slate-400">(ติ๊กเลือกเพื่อใส่ในวิดีโอ 8s)</span>
                  </div>
                  <button
                    onClick={handleDownloadAllImages}
                    className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>โหลดทั้งหมด</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {product.images.slice(0, 8).map((imgUrl, idx) => {
                    const isSelected = selectedImages.includes(imgUrl);
                    return (
                      <div 
                        key={idx} 
                        onClick={() => onToggleImageSelect(imgUrl)}
                        className={`group relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected ? 'border-shopee-primary ring-2 ring-orange-200' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`รูปสินค้า ${idx + 1}`} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          isSelected ? 'bg-shopee-primary text-white' : 'bg-black/50 text-white'
                        }`}>
                          {isSelected ? '✓' : idx + 1}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadImage(imgUrl, idx);
                          }}
                          className="absolute bottom-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="ดาวน์โหลดรูปนี้"
                        >
                          <Download className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Affiliate Link Generator */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-shopee-primary" />
                <span>ลิงก์ Affiliate ของคุณ</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={affiliateUrl || product.url}
                  onChange={(e) => onAffiliateUrlChange(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono truncate focus:outline-none focus:border-shopee-primary"
                  placeholder="Shopee URL with Sub ID"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action to proceed to Script AI */}
          <button
            onClick={onProceedToScript}
            className="w-full py-2.5 bg-gradient-to-r from-shopee-primary to-orange-500 hover:from-shopee-hover hover:to-orange-600 active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>ไปคิดบทสคริปต์ 8 วินาที (Viral 8s Hook)</span>
          </button>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-orange-100 text-shopee-primary mx-auto flex items-center justify-center">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">ยังไม่ได้ดึงข้อมูลสินค้า</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-[260px] mx-auto">
              เปิดหน้าสินค้าบน <span className="text-shopee-primary font-semibold">Shopee.co.th</span> ในแท็บปัจจุบัน แล้วกดปุ่ม <b>"ดึงข้อมูลทันที"</b> ด้านบน
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

