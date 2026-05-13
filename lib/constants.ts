export const CASES = [
  { id: 'A', name: 'A — Left Tower', description: 'Tall case on the far left wall' },
  { id: 'B', name: 'B — Center Left', description: 'Long low case, center left' },
  { id: 'C', name: 'C — Center Right', description: 'Long low case, center right' },
  { id: 'D', name: 'D — Right Tower', description: 'Tall case on the far right wall' },
  { id: 'B-top', name: 'B — Center Left, Top Surface', description: 'Pieces on top of Case B' },
  { id: 'C-top', name: 'C — Center Right, Top Surface', description: 'Pieces on top of Case C' },
] as const;

export const CASE_IDS = CASES.map((c) => c.id);
export type CaseId = (typeof CASES)[number]['id'];

export type Region = 'North America' | 'Mesoamerica' | 'South America' | 'Caribbean / Amazonia'

export const REGION_COLORS: Record<Region, string> = {
  'North America':        '#378ADD',
  'Mesoamerica':          '#BA7517',
  'South America':        '#1D9E75',
  'Caribbean / Amazonia': '#D85A30',
}

export const CULTURES: Array<{ culture: string; region: Region; lat: number; lng: number }> = [
  { culture: 'Ancestral Puebloans',  region: 'North America',        lat: 36.5,  lng: -108.5 },
  { culture: 'Mississippian',        region: 'North America',        lat: 33.5,  lng: -90.2  },
  { culture: 'Hohokam',              region: 'North America',        lat: 33.2,  lng: -111.8 },
  { culture: 'Mogollon / Mimbres',   region: 'North America',        lat: 32.8,  lng: -108.0 },
  { culture: 'Woodland',             region: 'North America',        lat: 40.0,  lng: -83.0  },
  { culture: 'Caddoan',              region: 'North America',        lat: 33.5,  lng: -94.5  },
  { culture: 'Pacific Northwest',    region: 'North America',        lat: 47.5,  lng: -122.5 },
  { culture: 'Plains / Great Basin', region: 'North America',        lat: 43.0,  lng: -107.0 },
  { culture: 'Maya',                 region: 'Mesoamerica',          lat: 17.0,  lng: -89.5  },
  { culture: 'Aztec / Mexica',       region: 'Mesoamerica',          lat: 19.4,  lng: -99.1  },
  { culture: 'Zapotec',              region: 'Mesoamerica',          lat: 17.0,  lng: -96.7  },
  { culture: 'Mixtec',               region: 'Mesoamerica',          lat: 17.5,  lng: -97.3  },
  { culture: 'Olmec',                region: 'Mesoamerica',          lat: 18.0,  lng: -94.8  },
  { culture: 'Toltec',               region: 'Mesoamerica',          lat: 19.9,  lng: -99.2  },
  { culture: 'Casas Grandes',        region: 'Mesoamerica',          lat: 30.4,  lng: -107.9 },
  { culture: 'Greater Nicoya',       region: 'Caribbean / Amazonia', lat: 10.5,  lng: -85.0  },
  { culture: 'Taíno',                region: 'Caribbean / Amazonia', lat: 18.5,  lng: -70.0  },
  { culture: 'Tairona',              region: 'South America',        lat: 11.0,  lng: -73.8  },
  { culture: 'Nazca',                region: 'South America',        lat: -14.8, lng: -75.0  },
  { culture: 'Moche',                region: 'South America',        lat: -8.1,  lng: -79.0  },
  { culture: 'Chimú',                region: 'South America',        lat: -8.3,  lng: -78.9  },
  { culture: 'Tiwanaku',             region: 'South America',        lat: -16.5, lng: -68.7  },
  { culture: 'Inca',                 region: 'South America',        lat: -13.5, lng: -72.0  },
]
