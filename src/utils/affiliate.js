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

