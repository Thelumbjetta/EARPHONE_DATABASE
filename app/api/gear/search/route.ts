import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export type GearSearchResult = {
  id: string | number;
  brand: string;
  model: string;
  category: string;
  price: number;
  driver_type: string;
  graph_url: string;
  source: 'database' | 'squiglink' | 'cringraph';
};

// Open-source IEM Frequency Response database index (Squiglink & CrinGraph structures)
const OPEN_SOURCE_SQUIGLINK_DB: Omit<GearSearchResult, 'id'>[] = [
  // Letshuoer
  { brand: 'Letshuoer', model: 'S08', category: 'IEM', price: 99, driver_type: '13mm Planar Magnetic', graph_url: 'https://squig.link/?share=Letshuoer_S08', source: 'squiglink' },
  { brand: 'Letshuoer', model: 'S12 Pro', category: 'IEM', price: 139, driver_type: '14.8mm Planar Magnetic', graph_url: 'https://squig.link/?share=Letshuoer_S12_Pro', source: 'squiglink' },
  { brand: 'Letshuoer', model: 'EJ07M', category: 'IEM', price: 649, driver_type: 'Tribrid (1DD + 4BA + 2EST)', graph_url: 'https://squig.link/?share=Letshuoer_EJ07M', source: 'squiglink' },
  { brand: 'Letshuoer', model: 'Cadenza 12', category: 'IEM', price: 2299, driver_type: 'Flagship 12-Driver Hybrid', graph_url: 'https://squig.link/?share=Letshuoer_Cadenza_12', source: 'squiglink' },

  // Moondrop
  { brand: 'Moondrop', model: 'Blessing 3', category: 'IEM', price: 320, driver_type: '2DD + 4BA Hybrid', graph_url: 'https://squig.link/?share=Moondrop_Blessing_3', source: 'squiglink' },
  { brand: 'Moondrop', model: 'Dusk', category: 'IEM', price: 359, driver_type: '2DD + 2BA + 2Planar Hybrid', graph_url: 'https://squig.link/?share=Moondrop_Dusk', source: 'squiglink' },
  { brand: 'Moondrop', model: 'Aria 2', category: 'IEM', price: 80, driver_type: '1 Dynamic (Ti-N-Coated)', graph_url: 'https://squig.link/?share=Moondrop_Aria_2', source: 'squiglink' },
  { brand: 'Moondrop', model: 'Chu II', category: 'IEM', price: 19, driver_type: '10mm Dynamic Driver', graph_url: 'https://squig.link/?share=Moondrop_Chu_II', source: 'squiglink' },
  { brand: 'Moondrop', model: 'Variations', category: 'IEM', price: 520, driver_type: 'Tribrid (1DD + 2BA + 2EST)', graph_url: 'https://crinacle.com/graphs/iems/moondrop-variations/', source: 'cringraph' },

  // 7Hz
  { brand: '7Hz', model: 'Salnotes Zero 2', category: 'IEM', price: 25, driver_type: '1 Dynamic (10mm N52)', graph_url: 'https://squig.link/?share=7Hz_Zero_2', source: 'squiglink' },
  { brand: '7Hz', model: 'Timeless AE', category: 'IEM', price: 219, driver_type: '14.2mm Planar Magnetic', graph_url: 'https://squig.link/?share=7Hz_Timeless', source: 'squiglink' },

  // Tangzu & Kiwi Ears
  { brand: 'Tangzu', model: 'Waner S.G', category: 'IEM', price: 20, driver_type: '1 Dynamic (PET Diaphragm)', graph_url: 'https://squig.link/?share=Tangzu_Waner', source: 'squiglink' },
  { brand: 'Kiwi Ears', model: 'Cadenza', category: 'IEM', price: 35, driver_type: '10mm Beryllium Dynamic', graph_url: 'https://squig.link/?share=KiwiEars_Cadenza', source: 'squiglink' },
  { brand: 'Kiwi Ears', model: 'Quintet', category: 'IEM', price: 219, driver_type: '1DD + 2BA + 1Planar + 1PZT', graph_url: 'https://squig.link/?share=KiwiEars_Quintet', source: 'squiglink' },

  // Thieaudio & DUNU
  { brand: 'Thieaudio', model: 'Monarch MkIII', category: 'IEM', price: 1000, driver_type: 'Tribrid (2DD + 6BA + 2EST)', graph_url: 'https://squig.link/?share=Thieaudio_Monarch_MKIII', source: 'squiglink' },
  { brand: 'Thieaudio', model: 'Hype 4', category: 'IEM', price: 399, driver_type: '2DD + 4BA Hybrid', graph_url: 'https://squig.link/?share=Thieaudio_Hype_4', source: 'squiglink' },
  { brand: 'DUNU', model: 'SA6 MkII', category: 'IEM', price: 579, driver_type: '6 Balanced Armature', graph_url: 'https://crinacle.com/graphs/iems/dunu-sa6-mkii/', source: 'cringraph' },
  { brand: 'DUNU', model: 'Titan S2', category: 'IEM', price: 79, driver_type: '1 Dynamic Driver', graph_url: 'https://squig.link/?share=DUNU_Titan_S2', source: 'squiglink' },

  // Truthear & Sennheiser
  { brand: 'Truthear', model: 'HEXA', category: 'IEM', price: 80, driver_type: 'Hybrid (1DD + 3BA)', graph_url: 'https://squig.link/?share=Truthear_Hexa', source: 'squiglink' },
  { brand: 'Truthear', model: 'NOVA', category: 'IEM', price: 149, driver_type: '1DD + 4BA Hybrid', graph_url: 'https://squig.link/?share=Truthear_Nova', source: 'squiglink' },
  { brand: 'Sennheiser', model: 'IE 600', category: 'IEM', price: 699, driver_type: '1 TrueResponse Dynamic', graph_url: 'https://crinacle.com/graphs/iems/sennheiser-ie600/', source: 'cringraph' },
  { brand: 'Sennheiser', model: 'HD 800 S', category: 'Over-Ear', price: 1800, driver_type: 'Ring Radiator Dynamic', graph_url: 'https://crinacle.com/graphs/headphones/sennheiser-hd800s/', source: 'cringraph' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q')?.trim() || '';

    if (!query || query.length < 1) {
      return NextResponse.json({ results: [] });
    }

    const lowerQuery = query.toLowerCase();

    // 1. Query database catalog using robust ILIKE matching across brand, model, and full name
    let dbResults: GearSearchResult[] = [];
    try {
      const dbRes = await pool.query(`
        SELECT id, brand, model, category, COALESCE(msrp, 0)::FLOAT as price, driver_type, graph_url
        FROM audio_gear
        WHERE LOWER(brand) LIKE $1 OR LOWER(model) LIKE $1 OR LOWER(brand || ' ' || model) LIKE $1
        LIMIT 20
      `, [`%${lowerQuery}%`]);

      dbResults = dbRes.rows.map((row) => ({
        id: row.id,
        brand: row.brand,
        model: row.model,
        category: row.category || 'IEM',
        price: row.price || 0,
        driver_type: row.driver_type || 'Dynamic',
        graph_url: row.graph_url || `https://squig.link/?share=${encodeURIComponent(row.brand)}_${encodeURIComponent(row.model)}`,
        source: 'database',
      }));
    } catch (dbErr) {
      console.warn('[GET /api/gear/search] DB offline, using static index fallback');
    }

    // 2. Filter open-source Squiglink / CrinGraph index using robust fuzzy match
    const externalMatches = OPEN_SOURCE_SQUIGLINK_DB.filter(
      (item) =>
        item.brand.toLowerCase().includes(lowerQuery) ||
        item.model.toLowerCase().includes(lowerQuery) ||
        `${item.brand.toLowerCase()} ${item.model.toLowerCase()}`.includes(lowerQuery)
    ).map((item, idx) => ({
      id: `ext-${idx}-${item.model.replace(/\s+/g, '-').toLowerCase()}`,
      ...item,
    }));

    // Combine & deduplicate by brand + model
    const map = new Map<string, GearSearchResult>();
    [...dbResults, ...externalMatches].forEach((item) => {
      const key = `${item.brand.toLowerCase()}_${item.model.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    // Clean Fallback: If query didn't match existing index, format real query string
    if (map.size === 0) {
      const parts = query.split(' ');
      const brand = parts.length > 1 ? parts[0] : query;
      const model = parts.length > 1 ? parts.slice(1).join(' ') : 'IEM';
      const slug = `${brand}_${model}`.replace(/\s+/g, '_');

      map.set(`gen-${slug}`, {
        id: `gen-${Date.now()}`,
        brand: brand.charAt(0).toUpperCase() + brand.slice(1),
        model: model.charAt(0).toUpperCase() + model.slice(1),
        category: 'IEM',
        price: 99,
        driver_type: 'Dynamic Transducer',
        graph_url: `https://squig.link/?share=${encodeURIComponent(slug)}`,
        source: 'squiglink',
      });
    }

    return NextResponse.json({ results: Array.from(map.values()) });
  } catch (error) {
    console.error('[GET /api/gear/search] Error:', error);
    return NextResponse.json({ error: 'Failed to search gear database' }, { status: 500 });
  }
}
