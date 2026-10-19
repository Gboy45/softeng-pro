export interface LookupResult {
  source: string;
  fields: {
    name?: string;
    brand?: string;
    size?: number;
    type?: string;
    gender?: string;
    price?: number;
  };
}

/**
 * Barcode predictor disabled per boutique configuration:
 * Barcodes no longer auto-predict or auto-fill brand/product details.
 */
export async function lookupProductDetails(_code: string): Promise<LookupResult | null> {
  return null;
}
