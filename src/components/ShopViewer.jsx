import React, { useState, useMemo } from 'react';
import { 
  Store, Star, Users, Package, RefreshCw, Download, Copy, Check, 
  ExternalLink, Search, CheckSquare, Square, Video, Sparkles, AlertCircle, ArrowLeft
} from 'lucide-react';
import { exportProductsToCSV, generateAffiliateUrl } from '../utils/affiliate';

export default function ShopViewer({
  shop,
  loading,
  error,
  onRefreshShop,
  onLoadMore,
  loadingMore,
  sortBy,
  onChangeSort,
  onSelectProduct,
  affiliateSubId,
  selectedProduct,
  onBackToSelectedProduct
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [copiedSuccess, setCopiedSuccess] = useState('');

  // Filter products by search term
  const filteredProducts = useMemo(() => {
    if (!shop?.products) return [];
    if (!searchTerm.trim()) return shop.products;
    const lower = searchTerm.toLowerCase();
    return shop.products.filter(p => p.title.toLowerCase().includes(lower));
  }, [shop?.products, searchTerm]);

  // Toggle item selection
  const handleToggleSelect = (itemId) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    if (selectedItemIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredProducts.map(p => p.itemId)));
    }
  };

  // Get items to act upon (if none selected, act on all filtered)
  const getTargetItems = () => {
    if (selectedItemIds.size > 0) {
      return filteredProducts.filter(p => selectedItemIds.has(p.itemId));
    }
    return filteredProducts;
  };

  // Export CSV
  const handleExportCSV = () => {
    const target = getTargetItems();
    if (target.length === 0) return;
    exportProductsToCSV(target, affiliateSubId, shop?.shopName || 'shopee_shop');
    setCopiedSuccess(`ส่งออก CSV สำเร็จ (${target.length} สินค้า)`);
    setTimeout(() => setCopiedSuccess(''), 2500);
  };

  // Copy Affiliate Links to Clipboard
  const handleCopyLinks = () => {
    const target = getTargetItems();
    if (target.length === 0) return;

    const linksText = target
      .map(p => {
        const affUrl = generateAffiliateUrl(p.url, affiliateSubId);
        return `${p.title}\nราคา: ${p.currentPrice}\nลิงก์: ${affUrl}\n`;
      })
      .join('\n');

    navigator.clipboard.writeText(linksText);
    setCopiedSuccess(`คัดลอก ${target.length} ลิงก์แล้ว!`);
    setTimeout(() => setCopiedSuccess(''), 2500);
  };

  const isAllSelected = filteredProducts.length > 0 && selectedItemIds.size === filteredProducts.length;

  return (
    <div className="p-3.5 space-y-3.5 pb-20">
      {/* Return to Single Product bar (if a product was previously chosen) */}
      {selectedProduct && onBackToSelectedProduct && (
        <div className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs shadow-sm">
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="font-semibold text-slate-700 shrink-0">กำลังเลือก:</span>
            <span className="text-slate-500 truncate">{selectedProduct.title}</span>
          </div>
          <button
            onClick={onBackToSelectedProduct}
            className="flex items-center gap-1 text-shopee-primary font-semibold hover:underline shrink-0"
          >
            <span>ดูสินค้า</span>
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      )}

      {/* Shop Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {shop?.avatar ? (
              <img 
                src={shop.avatar} 
                alt={shop.shopName} 
                className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-orange-100 text-shopee-primary flex items-center justify-center font-bold text-base shadow-sm">
                <Store className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="font-bold text-slate-800 text-sm leading-tight">
                  {shop?.shopName || 'หน้าร้านค้า Shopee'}
                </h2>
                {shop?.isOfficial && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                    Mall
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                รหัสร้าน: {shop?.shopId || '--'}
              </p>
            </div>
          </div>

          <button
            onClick={onRefreshShop}
            disabled={loading}
            title="รีเฟรชข้อมูลร้าน"
            className="p-1.5 text-slate-400 hover:text-shopee-primary hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Shop Stats Badge Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center">
          <div className="bg-slate-50 rounded-lg p-1.5">
            <div className="flex items-center justify-center gap-1 text-amber-600 font-bold text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{shop?.rating || '0.0'}</span>
            </div>
            <div className="text-[10px] text-slate-500">คะแนนร้าน</div>
          </div>

          <div className="bg-slate-50 rounded-lg p-1.5">
            <div className="flex items-center justify-center gap-1 text-slate-700 font-bold text-xs">
              <Package className="w-3.5 h-3.5 text-slate-500" />
              <span>{shop?.itemCount ? shop.itemCount.toLocaleString() : shop?.products?.length || 0}</span>
            </div>
            <div className="text-[10px] text-slate-500">สินค้าทั้งหมด</div>
          </div>

          <div className="bg-slate-50 rounded-lg p-1.5">
            <div className="flex items-center justify-center gap-1 text-slate-700 font-bold text-xs">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {shop?.followerCount 
                  ? (shop.followerCount > 1000 ? `${(shop.followerCount / 1000).toFixed(1)}k` : shop.followerCount) 
                  : '--'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500">ผู้ติดตาม</div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {copiedSuccess && (
        <div className="bg-emerald-600 text-white text-xs px-3 py-2 rounded-xl flex items-center justify-between shadow-md animate-fadeIn">
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-200" />
            <span>{copiedSuccess}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Sort Controls */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้าในร้านนี้..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-shopee-primary"
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          {/* Sort Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
            <button
              onClick={() => onChangeSort && onChangeSort('pop')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                sortBy === 'pop' 
                  ? 'bg-white text-shopee-primary shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ขายดีสุด
            </button>
            <button
              onClick={() => onChangeSort && onChangeSort('ctime')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                sortBy === 'ctime' 
                  ? 'bg-white text-shopee-primary shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ใหม่ล่าสุด
            </button>
            <button
              onClick={() => onChangeSort && onChangeSort('sales')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                sortBy === 'sales' 
                  ? 'bg-white text-shopee-primary shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ยอดสั่งซื้อ
            </button>
          </div>

          {/* Select All Toggle */}
          <button
            onClick={handleToggleSelectAll}
            className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-shopee-primary font-medium"
          >
            {isAllSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-shopee-primary" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>
              {selectedItemIds.size > 0 
                ? `เลือก (${selectedItemIds.size}/${filteredProducts.length})` 
                : 'เลือกทั้งหมด'}
            </span>
          </button>
        </div>
      </div>

      {/* Products List */}
      <div className="space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs">
            {loading ? 'กำลังดึงรายการสินค้าในร้าน...' : 'ไม่พบสินค้าตามคำค้นหา'}
          </div>
        ) : (
          filteredProducts.map((p, idx) => {
            const isSelected = selectedItemIds.has(p.itemId);
            return (
              <div
                key={p.itemId || idx}
                className={`bg-white rounded-xl border p-2.5 transition-all shadow-xs ${
                  isSelected 
                    ? 'border-shopee-primary bg-orange-50/20 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex gap-2.5">
                  {/* Select Checkbox & Thumbnail */}
                  <div className="relative shrink-0 flex items-start gap-1.5">
                    <button
                      onClick={() => handleToggleSelect(p.itemId)}
                      className="mt-1 text-slate-400 hover:text-shopee-primary"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-shopee-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                    <img
                      src={p.imageUrl || (p.images && p.images[0]) || ''}
                      alt={p.title}
                      className="w-16 h-16 rounded-lg object-cover border border-slate-100 bg-slate-100 shrink-0"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-medium text-slate-800 text-xs leading-snug line-clamp-2">
                        {p.title}
                      </h4>

                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-shopee-primary font-bold text-sm">
                          {p.currentPrice || '฿--'}
                        </span>
                        {p.originalPrice && (
                          <span className="text-slate-400 text-[10px] line-through">
                            {p.originalPrice}
                          </span>
                        )}
                        {p.discount && (
                          <span className="bg-orange-100 text-shopee-primary text-[9px] font-bold px-1 rounded">
                            {p.discount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        {p.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            {p.rating}
                          </span>
                        )}
                        {p.soldCount && (
                          <span>ขายแล้ว {p.soldCount}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          title="เปิดดูบน Shopee"
                          className="p-1 text-slate-400 hover:text-slate-600 rounded"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => onSelectProduct(p)}
                          className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-shopee-primary text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-xs hover:opacity-90 active:scale-95 transition-all"
                        >
                          <Video className="w-3 h-3" />
                          <span>ทำคลิป 8s</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More Button */}
      {shop?.products?.length > 0 && onLoadMore && (
        <div className="text-center pt-1">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-98 rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMore ? 'animate-spin' : ''}`} />
            <span>{loadingMore ? 'กำลังโหลดเพิ่ม...' : `โหลดเพิ่มอีก 30 รายการ (${shop.products.length} ชิ้นที่แสดง)`}</span>
          </button>
        </div>
      )}

      {/* Sticky Bottom Bulk Action Bar */}
      {filteredProducts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 px-3 flex items-center justify-between gap-2 shadow-lg z-40">
          <div className="text-[11px] text-slate-600 shrink-0">
            {selectedItemIds.size > 0 ? (
              <span className="font-semibold text-shopee-primary">เลือก {selectedItemIds.size} รายการ</span>
            ) : (
              <span>ทั้งหมด {filteredProducts.length} ชิ้น</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyLinks}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
              title="คัดลอก Affiliate Links ทั้งหมด"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>คัดลอกลิงก์</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 bg-shopee-primary hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95"
              title="ส่งออกตารางเป็นไฟล์ CSV/Excel พร้อม Shopee Affiliate Link"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

