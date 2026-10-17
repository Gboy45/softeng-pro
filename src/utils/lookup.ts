const LOOKUP_TIMEOUT_MS = 4000;

export interface LookupResult {
  source: string;
  fields: {
    name?: string;
    brand?: string;
    size?: number;
    type?: string;
    gender?: string;
  };
}

async function fetchJsonWithTimeout(url: string): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseProductDetails(raw: { name?: string; brand?: string; quantity?: string }) {
  const text = `${raw.name || ''} ${raw.quantity || ''}`;
  const lower = text.toLowerCase();
  const out: LookupResult['fields'] = {};

  const sizeRe = /(\d+(?:[.,]\d+)?)\s*(ml|cl|fl\.?\s?oz|oz)\b/i;
  const sm = text.match(sizeRe);
  if (sm) {
    let n = parseFloat(sm[1].replace(',', '.'));
    const unit = sm[2].toLowerCase().replace(/[\s.]/g, '');
    if (unit === 'cl') n *= 10;
    else if (unit === 'oz' || unit === 'floz') n *= 29.5735;
    if (n > 0) out.size = Math.round(n);
  }

  if (/eau de parfum|\bedp\b/.test(lower)) out.type = 'Eau de Parfum';
  else if (/eau de toilette|\bedt\b/.test(lower)) out.type = 'Eau de Toilette';
  else if (/eau fra[iî]che/.test(lower)) out.type = 'Eau Fraiche';
  else if (/cologne|\bedc\b/.test(lower)) out.type = 'Cologne';
  else if (/\boil\b/.test(lower)) out.type = 'Perfume Oil';

  if (/\bunisex\b/.test(lower)) out.gender = 'Unisex';
  else if (/\b(women|woman|femme|for her|pour elle|ladies)\b/.test(lower)) out.gender = 'For Women';
  else if (/\b(men|man|homme|for him|pour lui)\b/.test(lower)) out.gender = 'For Men';

  let name = String(raw.name || '').replace(sizeRe, ' ');
  name = name.replace(/[^A-Za-z\u00C0-\u017F .'-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (name) out.name = name;

  const brand = String(raw.brand || '').replace(/\s+/g, ' ').trim();
  if (brand) out.brand = brand;

  return out;
}

export async function lookupProductDetails(code: string): Promise<LookupResult | null> {
  const c = encodeURIComponent(String(code).trim());
  const OF_FIELDS = 'fields=product_name,generic_name,brands,quantity';

  const sources = [
    {
      name: 'Open Beauty Facts',
      url: `https://world.openbeautyfacts.org/api/v2/product/${c}.json?${OF_FIELDS}`,
      read: (j: any) => {
        if (j?.status === 1 && j.product) {
          return {
            name: j.product.product_name || j.product.generic_name || '',
            brand: String(j.product.brands || '').split(',')[0].trim(),
            quantity: j.product.quantity || '',
          };
        }
        return null;
      },
    },
    {
      name: 'Open Food Facts',
      url: `https://world.openfoodfacts.org/api/v2/product/${c}.json?${OF_FIELDS}`,
      read: (j: any) => {
        if (j?.status === 1 && j.product) {
          return {
            name: j.product.product_name || j.product.generic_name || '',
            brand: String(j.product.brands || '').split(',')[0].trim(),
            quantity: j.product.quantity || '',
          };
        }
        return null;
      },
    },
  ];

  try {
    const promises = sources.map(async (src) => {
      const json = await fetchJsonWithTimeout(src.url);
      const raw = json ? src.read(json) : null;
      return raw ? { source: src.name, raw } : null;
    });

    const results = await Promise.allSettled(promises);
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        const fields = parseProductDetails(r.value.raw);
        if (Object.keys(fields).length > 0) {
          return { source: r.value.source, fields };
        }
      }
    }
  } catch {
    // Ignore offline errors
  }

  return null;
}
