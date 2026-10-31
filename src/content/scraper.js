// Shopee Content Script - Product & Shop Scraper (Hybrid)

function getShopUsername(pathname) {
  if (!pathname) return '';
  const parts = pathname.split('/').filter(Boolean);
  const excluded = [
    'cart', 'buyer', 'user', 'search', 'flash_sale', 'daily_discover',
    'portal', 'affiliate', 'checkout', 'order', 'all_categories',
    'm', 'help', 'policies', 'shopee-coins', 'shopee-mall', 'product'
  ];
  if (parts.length > 0 && !excluded.includes(parts[0].toLowerCase())) {
    return parts[0];
  }
  return '';
}

function parseShopeeIds(url) {
  const urlsToCheck = [url || window.location.href];

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

function detectShopeePageType(url) {
  const currentUrl = url || window.location.href;
  
  // 1. Check if Single Product
  const ids = parseShopeeIds(currentUrl);
  if (ids && ids.itemId) {
    return { type: 'PRODUCT', ids };
  }

  // 2. Check if Shop Page
  try {
    const parsed = new URL(currentUrl);
    const pathname = parsed.pathname;

    // Pattern /shop/12345678
    const shopMatch = pathname.match(/\/shop\/(\d+)/);
    if (shopMatch) {
      return { type: 'SHOP', shopId: shopMatch[1] };
    }

    // Pattern /{username}
    const username = getShopUsername(pathname);
    if (username) {
      return { type: 'SHOP', shopUsername: username };
    }

    // Check DOM markers if inside active page
    if (document.querySelector('.section-seller-overview-horizontal, .shop-page, .shop-search-result-view')) {
      const parts = pathname.split('/').filter(Boolean);
      return { type: 'SHOP', shopUsername: parts[0] || '' };
    }
  } catch (e) {
    // Ignore URL parse error
  }

  return { type: 'UNKNOWN' };
}

function getShopeeImageUrl(imageHash) {
  if (!imageHash) return '';
  if (imageHash.startsWith('http')) return imageHash;
  return `https://down-th.img.susercontent.com/file/${imageHash}`;
}

function formatShopeeProductData(data, shopId = '', itemId = '', shopName = '', productUrl = '') {
  let product = {
    url: productUrl || window.location.href,
    shopId: String(shopId || ''),
    itemId: String(itemId || ''),
    title: data.title || data.name || '',
    currentPrice: '',
    originalPrice: '',
    discount: '',
    rating: 0,
    soldCount: '',
    shopName: shopName || '',
    description: data.description || '',
    specifications: [],
    images: [],
    videoUrl: '',
    extractedAt: new Date().toISOString()
  };

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

  // Specifications / Attributes
  if (Array.isArray(data.attributes)) {
    product.specifications = data.attributes.map(attr => ({
      name: attr.name || '',
      value: attr.value || ''
    }));
  }

  return product;
}

async function scrapeSingleProductById(shopId, itemId) {
  if (!itemId) throw new Error('ไม่พบ itemId ของสินค้า');

  const apiUrl = shopId 
    ? `https://shopee.co.th/api/v4/pdp/get_pc?item_id=${itemId}&shop_id=${shopId}`
    : `https://shopee.co.th/api/v4/item/get?itemid=${itemId}`;

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  if (!response.ok) {
    throw new Error(`ไม่สามารถเชื่อมต่อ Shopee API (status: ${response.status})`);
  }

  const json = await response.json();
  const data = json?.data?.item || json?.data;
  if (!data) throw new Error('ไม่พบข้อมูลสินค้านี้จากระบบ Shopee');

  const productUrl = `https://shopee.co.th/product/${shopId || data.shopid || ''}/${itemId}`;
  const shopName = json?.data?.shop_detailed?.name || '';
  return formatShopeeProductData(data, shopId || data.shopid, itemId, shopName, productUrl);
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
          const shopName = json?.data?.shop_detailed?.name || product.shopName;
          const formatted = formatShopeeProductData(data, ids.shopId, ids.itemId, shopName, currentUrl);
          return formatted;
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

  // Validation
  if (!product.title) {
    throw new Error('ไม่พบข้อมูลสินค้าในหน้านี้ กรุณาคลิกเข้าไปที่หน้าสินค้า Shopee ที่ต้องการก่อนกดดึงข้อมูล');
  }

  return product;
}

function scrapeShopItemsFromDOM(shopId) {
  const items = [];
  const cardElements = document.querySelectorAll(
    'div.shop-search-result-view__item, div[data-sq="link"], a[href*="-i."]'
  );

  cardElements.forEach(card => {
    try {
      const anchor = card.tagName === 'A' ? card : card.querySelector('a');
      const href = anchor ? (anchor.getAttribute('href') || '') : '';
      const fullUrl = href.startsWith('http') ? href : `https://shopee.co.th${href}`;
      const ids = parseShopeeIds(fullUrl);
      if (!ids || !ids.itemId) return;

      const titleEl = card.querySelector('div[data-sq="item-name"], div.whitespace-normal, .C2x_EB') || card.querySelector('img[alt]');
      const title = titleEl?.innerText?.trim() || titleEl?.getAttribute('alt') || '';

      const imgEl = card.querySelector('img');
      let imgUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
      if (imgUrl) imgUrl = imgUrl.replace(/_tn$/, '').replace(/@.*$/, '');

      let price = '';
      const priceEl = card.querySelector('span.text-base, div.text-base, ._1w9jLI');
      if (priceEl) {
        price = priceEl.innerText.trim();
        if (!price.startsWith('฿')) price = `฿${price}`;
      }

      let sold = '';
      const soldEl = card.querySelector('.text-xs, ._18SLBt');
      if (soldEl && (soldEl.innerText.includes('ขาย') || soldEl.innerText.includes('sold'))) {
        sold = soldEl.innerText.replace(/ขายแล้ว|sold/gi, '').trim();
      }

      items.push({
        itemId: ids.itemId,
        shopId: ids.shopId || shopId || '',
        title: title || `สินค้า ${ids.itemId}`,
        currentPrice: price,
        originalPrice: '',
        discount: '',
        soldCount: sold,
        rating: 0,
        imageUrl: imgUrl,
        images: imgUrl ? [imgUrl] : [],
        url: fullUrl
      });
    } catch (e) {
      // Ignore single card parse error
    }
  });

  return items;
}

async function scrapeShopeeShop({ limit = 30, offset = 0, sortBy = 'pop' } = {}) {
  const currentUrl = window.location.href;
  const pageInfo = detectShopeePageType(currentUrl);

  let shopId = pageInfo.shopId || '';
  let shopUsername = pageInfo.shopUsername || '';

  // If no username or shopId found, try parsing pathname
  if (!shopId && !shopUsername) {
    shopUsername = getShopUsername(window.location.pathname);
  }

  let shopDetail = null;

  // Resolve shopId via username
  if (!shopId && shopUsername) {
    try {
      const res = await fetch(`https://shopee.co.th/api/v4/shop/get_shop_detail?username=${encodeURIComponent(shopUsername)}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.shopid) {
          shopId = String(json.data.shopid);
          shopDetail = json.data;
        }
      }
    } catch (e) {
      console.warn('Failed to resolve shop detail by username:', e);
    }
  }

  // If we have shopId, fetch shop detail if needed
  if (shopId && !shopDetail) {
    try {
      const res = await fetch(`https://shopee.co.th/api/v4/shop/get_shop_base?shopid=${shopId}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          shopDetail = json.data;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch shop base:', e);
    }
  }

  // Fallback to DOM if shopDetail still missing
  if (!shopDetail) {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
    const h1Title = document.querySelector('h1')?.innerText?.trim() || '';
    const shopHeaderTitle = document.querySelector('.section-seller-overview-horizontal__seller-info h1')?.innerText?.trim() || '';
    
    shopDetail = {
      name: shopHeaderTitle || ogTitle || h1Title || shopUsername || 'ร้านค้า Shopee',
      shopid: shopId
    };
  }

  // Fetch shop items
  let items = [];
  let totalCount = shopDetail?.item_count || 0;

  if (shopId) {
    try {
      const itemsApi = `https://shopee.co.th/api/v4/shop/search_items?shopid=${shopId}&limit=${limit}&offset=${offset}&sort_by=${sortBy}&order=desc`;
      const res = await fetch(itemsApi, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      if (res.ok) {
        const json = await res.json();
        const rawItems = json?.data?.items || [];
        totalCount = json?.data?.total_count || totalCount || rawItems.length;

        items = rawItems.map(wrapper => {
          const item = wrapper.item_basic || wrapper;
          const rawPrice = item.price || item.price_min;
          const rawPriceBefore = item.price_before_discount || item.price_max_before_discount;
          const formattedPrice = rawPrice ? (rawPrice / 100000).toLocaleString('th-TH', { maximumFractionDigits: 2 }) : '';
          const formattedBefore = (rawPriceBefore && rawPriceBefore > rawPrice) 
            ? (rawPriceBefore / 100000).toLocaleString('th-TH', { maximumFractionDigits: 2 }) 
            : '';

          let discount = '';
          if (item.raw_discount && item.raw_discount > 0) {
            discount = `-${item.raw_discount}%`;
          } else if (rawPriceBefore && rawPriceBefore > rawPrice) {
            discount = `-${Math.round((1 - (rawPrice / rawPriceBefore)) * 100)}%`;
          }

          let soldStr = '';
          const soldVal = item.historical_sold ?? item.sold;
          if (soldVal !== undefined && soldVal !== null) {
            soldStr = soldVal > 1000 ? `${(soldVal / 1000).toFixed(1)}k+` : `${soldVal}`;
          }

          const imgUrl = item.image ? getShopeeImageUrl(item.image) : (item.images && item.images[0] ? getShopeeImageUrl(item.images[0]) : '');
          const allImages = Array.isArray(item.images) && item.images.length > 0 
            ? item.images.map(img => getShopeeImageUrl(img))
            : (imgUrl ? [imgUrl] : []);

          return {
            itemId: String(item.itemid || ''),
            shopId: String(item.shopid || shopId),
            title: item.name || '',
            currentPrice: formattedPrice ? `฿${formattedPrice}` : '',
            originalPrice: formattedBefore ? `฿${formattedBefore}` : '',
            discount,
            soldCount: soldStr,
            rating: item.item_rating?.rating_star ? parseFloat(item.item_rating.rating_star.toFixed(1)) : 0,
            imageUrl: imgUrl,
            images: allImages,
            url: `https://shopee.co.th/product/${item.shopid || shopId}/${item.itemid}`
          };
        });
      }
    } catch (e) {
      console.warn('API search_items failed, checking DOM fallback:', e);
    }
  }

  // Fallback to DOM if API gave 0 items
  if (items.length === 0) {
    items = scrapeShopItemsFromDOM(shopId);
  }

  if (items.length === 0 && !shopDetail?.name) {
    throw new Error('ไม่พบข้อมูลร้านค้าหรือสินค้าในหน้านี้ กรุณาเข้าหน้าร้านค้า Shopee ที่ต้องการ');
  }

  const shopAvatar = shopDetail?.portrait ? getShopeeImageUrl(shopDetail.portrait) : '';

  return {
    shopId: String(shopId || ''),
    shopName: shopDetail?.name || shopUsername || 'ร้านค้า Shopee',
    avatar: shopAvatar,
    rating: shopDetail?.rating_star ? parseFloat(shopDetail.rating_star.toFixed(1)) : 0,
    itemCount: totalCount || items.length,
    followerCount: shopDetail?.follower_count || 0,
    isOfficial: !!shopDetail?.is_official_shop,
    products: items,
    offset,
    limit,
    sortBy,
    extractedAt: new Date().toISOString()
  };
}

// Runtime Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DETECT_PAGE_TYPE') {
    const info = detectShopeePageType(window.location.href);
    sendResponse({ success: true, pageInfo: info });
    return true;
  }

  if (request.action === 'SCRAPE_PRODUCT') {
    scrapeShopeeProduct().then(data => {
      sendResponse({ success: true, product: data });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (request.action === 'SCRAPE_SHOP') {
    scrapeShopeeShop(request.options || {}).then(data => {
      sendResponse({ success: true, shop: data });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (request.action === 'SCRAPE_PRODUCT_BY_ID') {
    scrapeSingleProductById(request.shopId, request.itemId).then(data => {
      sendResponse({ success: true, product: data });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
});
