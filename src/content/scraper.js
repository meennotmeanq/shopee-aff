// Shopee Content Script - Product Scraper

function getShopUsername(pathname) {
  if (!pathname) return '';
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && !parts[0].includes('product') && !parts[0].includes('cart') && !parts[0].includes('buyer')) {
    return parts[0];
  }
  return '';
}

function parseShopeeIds(url) {
  const urlsToCheck = [url];

  // Also check canonical link if on page
  try {
    const canonicalHref = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    if (canonicalHref && !urlsToCheck.includes(canonicalHref)) {
      urlsToCheck.push(canonicalHref);
    }

    const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content');
    if (ogUrl && !urlsToCheck.includes(ogUrl)) {
      urlsToCheck.push(ogUrl);
    }
  } catch (e) {
    // Ignore DOM query error
  }

  for (const targetUrl of urlsToCheck) {
    if (!targetUrl) continue;

    // Pattern 1: ...-i.SHOPID.ITEMID
    const match1 = targetUrl.match(/-i\.(\d+)\.(\d+)/);
    if (match1) {
      return { shopId: match1[1], itemId: match1[2] };
    }

    // Pattern 2: /product/SHOPID/ITEMID
    const match2 = targetUrl.match(/\/product\/(\d+)\/(\d+)/);
    if (match2) {
      return { shopId: match2[1], itemId: match2[2] };
    }

    // Pattern 3: query params (case insensitive check for itemId/itemid/item_id and shopId/shopid/shop_id)
    try {
      const parsed = new URL(targetUrl, window.location.origin);
      let foundItemId = null;
      let foundShopId = null;

      for (const [key, val] of parsed.searchParams.entries()) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'itemid' || lowerKey === 'item_id') {
          foundItemId = val;
        }
        if (lowerKey === 'shopid' || lowerKey === 'shop_id') {
          foundShopId = val;
        }
      }

      if (foundItemId) {
        return { 
          shopId: foundShopId || '', 
          itemId: foundItemId, 
          shopUsername: getShopUsername(parsed.pathname) 
        };
      }
    } catch (e) {
      // Ignore URL parse error
    }
  }

  return null;
}

function getShopeeImageUrl(imageHash) {
  if (!imageHash) return '';
  if (imageHash.startsWith('http')) return imageHash;
  return `https://down-th.img.susercontent.com/file/${imageHash}`;
}

async function scrapeShopeeProduct() {
  const currentUrl = window.location.href;
  const ids = parseShopeeIds(currentUrl);

  let product = {
    url: currentUrl,
    shopId: ids ? ids.shopId : '',
    itemId: ids ? ids.itemId : '',
    title: '',
    currentPrice: '',
    originalPrice: '',
    discount: '',
    rating: 0,
    soldCount: '',
    shopName: '',
    description: '',
    specifications: [],
    images: [],
    videoUrl: '',
    extractedAt: new Date().toISOString()
  };

  // If itemId is present but shopId is missing, try resolving shopId via username
  if (ids && ids.itemId && !ids.shopId && ids.shopUsername) {
    try {
      const shopRes = await fetch(`https://shopee.co.th/api/v4/shop/get_shop_detail?username=${encodeURIComponent(ids.shopUsername)}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (shopRes.ok) {
        const shopJson = await shopRes.json();
        const resolvedShopId = shopJson?.data?.shopid;
        if (resolvedShopId) {
          ids.shopId = String(resolvedShopId);
          product.shopId = ids.shopId;
          product.shopName = shopJson?.data?.name || ids.shopUsername;
        }
      }
    } catch (e) {
      console.warn('Could not resolve shopId from username:', e);
    }
  }

  // Attempt 1: Shopee Internal API
  if (ids && ids.itemId) {
    try {
      // Try PDP PC API
      const apiUrl = ids.shopId 
        ? `https://shopee.co.th/api/v4/pdp/get_pc?item_id=${ids.itemId}&shop_id=${ids.shopId}`
        : `https://shopee.co.th/api/v4/item/get?itemid=${ids.itemId}`;

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (response.ok) {
        const json = await response.json();
        const data = json?.data?.item || json?.data;
        if (data && (data.title || data.name)) {
          product.title = data.title || data.name || '';
          
          // Price formatting (Shopee prices in API are often scaled by 100,000)
          const rawPrice = data.price || data.price_min;
          const rawPriceBefore = data.price_before_discount || data.price_max_before_discount;
          
          if (rawPrice) {
            const formatted = (rawPrice / 100000).toLocaleString('th-TH', { maximumFractionDigits: 2 });
            product.currentPrice = `฿${formatted}`;
          }
          if (rawPriceBefore && rawPriceBefore > rawPrice) {
            const formattedBefore = (rawPriceBefore / 100000).toLocaleString('th-TH', { maximumFractionDigits: 2 });
            product.originalPrice = `฿${formattedBefore}`;
            const discountPct = Math.round((1 - (rawPrice / rawPriceBefore)) * 100);
            if (discountPct > 0) {
              product.discount = `-${discountPct}%`;
            }
          }

          // Rating & Sold
          if (data.item_rating) {
            product.rating = parseFloat(data.item_rating.rating_star?.toFixed(1) || '0');
          }
          if (data.historical_sold) {
            product.soldCount = data.historical_sold > 1000 
              ? `${(data.historical_sold / 1000).toFixed(1)}k+` 
              : `${data.historical_sold}`;
          }

          // Images
          if (Array.isArray(data.images) && data.images.length > 0) {
            product.images = data.images.map(img => getShopeeImageUrl(img));
          } else if (data.image) {
            product.images = [getShopeeImageUrl(data.image)];
          }

          // Video
          if (data.video_info_list && data.video_info_list.length > 0) {
            product.videoUrl = data.video_info_list[0].default_format?.url || '';
          }

          // Description
          product.description = data.description || '';

          // Specifications / Attributes
          if (Array.isArray(data.attributes)) {
            product.specifications = data.attributes.map(attr => ({
              name: attr.name || '',
              value: attr.value || ''
            }));
          }

          if (json?.data?.shop_detailed?.name) {
            product.shopName = json.data.shop_detailed.name;
          }
        }
      }
    } catch (err) {
      console.warn('Shopee API fetch failed, falling back to DOM scraper:', err);
    }
  }

  // Attempt 2: JSON-LD Schema on Page
  try {
    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of ldScripts) {
      if (!s.textContent) continue;
      const parsed = JSON.parse(s.textContent);
      const item = Array.isArray(parsed) ? parsed[0] : parsed;
      if (item && (item['@type'] === 'Product' || item.name)) {
        if (!product.title && item.name) product.title = item.name;
        if (!product.description && item.description) product.description = item.description;
        if (product.images.length === 0 && item.image) {
          if (Array.isArray(item.image)) product.images.push(...item.image);
          else product.images.push(item.image);
        }
        if (!product.currentPrice && item.offers?.price) {
          product.currentPrice = `฿${parseFloat(item.offers.price).toLocaleString('th-TH')}`;
        }
      }
    }
  } catch (e) {
    // Ignore JSON-LD parse error
  }

  // Attempt 3: Standard DOM & Meta Tag Fallback
  if (!product.title) {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const h1Title = document.querySelector('h1')?.innerText?.trim();
    const titleEl = document.querySelector('div.section-product-briefing span') || 
                    document.querySelector('.product-briefing .attM6q');
    product.title = ogTitle || h1Title || titleEl?.innerText?.trim() || '';
  }

  if (!product.currentPrice) {
    const ogPrice = document.querySelector('meta[property="product:price:amount"]')?.getAttribute('content');
    if (ogPrice) {
      product.currentPrice = `฿${parseFloat(ogPrice).toLocaleString('th-TH')}`;
    } else {
      const priceEl = document.querySelector('div.G27Shz') || document.querySelector('.pdp-price');
      if (priceEl && priceEl.innerText) {
        product.currentPrice = priceEl.innerText.trim();
      } else {
        // Safe DOM search for price symbol
        const elements = document.querySelectorAll('div, span');
        for (const el of elements) {
          const txt = el.textContent?.trim() || '';
          if (txt.startsWith('฿') && txt.length < 20 && /\d/.test(txt)) {
            product.currentPrice = txt;
            break;
          }
        }
      }
    }
  }

  if (product.images.length === 0) {
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    if (ogImage) {
      product.images.push(ogImage);
    }

    const imgElements = document.querySelectorAll('picture img, div.product-carousel img, img[src*="s-sg"], img[src*="down-th"]');
    const foundUrls = new Set(product.images);
    
    imgElements.forEach(img => {
      let src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      if (src && !src.includes('badge') && !src.includes('avatar') && !src.includes('icon') && !src.includes('logo')) {
        src = src.replace(/_tn$/, '').replace(/@.*$/, '');
        if (!foundUrls.has(src) && foundUrls.size < 8) {
          foundUrls.add(src);
        }
      }
    });

    product.images = Array.from(foundUrls);
  }

  if (!product.description) {
    const descEl = document.querySelector('div.product-detail') || 
                   document.querySelector('.f7aM2o') ||
                   document.querySelector('meta[property="og:description"]');
    if (descEl) {
      product.description = descEl.innerText || descEl.getAttribute('content') || '';
    }
  }

  // Validation: If no title or price could be extracted at all
  if (!product.title) {
    throw new Error('ไม่พบข้อมูลสินค้าในหน้านี้ กรุณาคลิกเข้าไปที่หน้าสินค้า Shopee ที่ต้องการก่อนกดดึงข้อมูล');
  }

  return product;
}

// Listen for message from Extension popup / sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCRAPE_PRODUCT') {
    scrapeShopeeProduct().then(data => {
      sendResponse({ success: true, product: data });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep channel open for async response
  }
});
