// Affiliate Link Utilities

export function generateAffiliateUrl(originalUrl, subId = '', customTag = '') {
  if (!originalUrl) return '';

  try {
    const url = new URL(originalUrl);
    
    // Clean unnecessary tracking params
    const cleanParams = new URLSearchParams();
    
    if (url.searchParams.has('shopid')) cleanParams.set('shopid', url.searchParams.get('shopid'));
    if (url.searchParams.has('itemid')) cleanParams.set('itemid', url.searchParams.get('itemid'));
    
    // Add affiliate params
    if (subId) {
      cleanParams.set('sub_id', subId.trim());
      cleanParams.set('aff_sub', subId.trim());
    }
    if (customTag) {
      cleanParams.set('utm_source', 'affiliate');
      cleanParams.set('utm_campaign', customTag.trim());
    }

    const query = cleanParams.toString();
    return query ? `${url.origin}${url.pathname}?${query}` : `${url.origin}${url.pathname}`;
  } catch (e) {
    return originalUrl;
  }
}

/**
 * Export products array to UTF-8 CSV with Thai BOM
 */
export function exportProductsToCSV(products, subId = '', shopName = 'shopee_shop') {
  if (!products || products.length === 0) return;

  const headers = [
    'รหัสสินค้า (Item ID)',
    'ชื่อสินค้า (Title)',
    'ราคาปัจจุบัน (Current Price)',
    'ราคาเดิม (Original Price)',
    'ส่วนลด (Discount)',
    'ยอดขาย (Sold Count)',
    'คะแนน (Rating)',
    'ลิงก์สินค้าเดิม (Shopee URL)',
    'ลิงก์ Affiliate (Affiliate Link)',
    'รูปภาพสินค้า (Image URL)'
  ];

  const rows = products.map(p => {
    const affUrl = generateAffiliateUrl(p.url, subId);
    const cleanTitle = (p.title || '').replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
    const imgUrl = (p.images && p.images[0]) || p.imageUrl || '';
    
    return [
      `"${p.itemId || ''}"`,
      `"${cleanTitle}"`,
      `"${p.currentPrice || ''}"`,
      `"${p.originalPrice || ''}"`,
      `"${p.discount || ''}"`,
      `"${p.soldCount || ''}"`,
      `"${p.rating || ''}"`,
      `"${p.url || ''}"`,
      `"${affUrl || ''}"`,
      `"${imgUrl}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const cleanShopName = (shopName || 'shopee').replace(/[^a-zA-Z0-9_\u0E00-\u0E7F-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${cleanShopName}_affiliate_products_${dateStr}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


