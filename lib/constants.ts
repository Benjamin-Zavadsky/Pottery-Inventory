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

export const CONDITIONS = ['Mint', 'Excellent', 'Good', 'Fair', 'Poor'] as const;
export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Museum-Grade'] as const;
export const ORIGINALITIES = [
  'Authenticated Original',
  'Suspected Original',
  'Reproduction',
  'Unknown',
] as const;

export type Region =
  | 'North America'
  | 'Mesoamerica'
  | 'South America'
  | 'Caribbean / Amazonia'
  | 'Europe'
  | 'Africa'
  | 'Middle East'
  | 'South Asia'
  | 'East Asia'
  | 'Southeast Asia'
  | 'Oceania';

export const REGION_COLORS: Record<Region, string> = {
  // Americas (original)
  'North America': '#378ADD',
  Mesoamerica: '#BA7517',
  'South America': '#1D9E75',
  'Caribbean / Amazonia': '#D85A30',
  // Worldwide
  Europe: '#6C3483',
  Africa: '#A04000',
  'Middle East': '#C4A217',
  'South Asia': '#C0392B',
  'East Asia': '#1A5276',
  'Southeast Asia': '#1E8449',
  Oceania: '#2980B9',
};

export const CULTURES: Array<{ culture: string; region: Region; lat: number; lng: number }> = [
  // ── North America ──────────────────────────────────────────────────────────
  { culture: 'Ancestral Puebloans', region: 'North America', lat: 36.5, lng: -108.5 },
  { culture: 'Mississippian', region: 'North America', lat: 33.5, lng: -90.2 },
  { culture: 'Hohokam', region: 'North America', lat: 33.2, lng: -111.8 },
  { culture: 'Mogollon / Mimbres', region: 'North America', lat: 32.8, lng: -108.0 },
  { culture: 'Woodland', region: 'North America', lat: 40.0, lng: -83.0 },
  { culture: 'Caddoan', region: 'North America', lat: 33.5, lng: -94.5 },
  { culture: 'Pacific Northwest', region: 'North America', lat: 47.5, lng: -122.5 },
  { culture: 'Plains / Great Basin', region: 'North America', lat: 43.0, lng: -107.0 },
  // Adena — Early Woodland, plain grit-tempered wares, ~800 BCE–1 CE, Ohio Valley
  { culture: 'Adena', region: 'North America', lat: 39.0, lng: -83.0 },
  // Hopewell — Middle Woodland, zoned incised cord-marked wares, ~200 BCE–500 CE, Ohio Valley
  { culture: 'Hopewell', region: 'North America', lat: 39.3, lng: -83.0 },
  // Coles Creek — grog-tempered, upper-vessel incised decoration, ~700–1200 CE, Lower Mississippi Valley
  { culture: 'Coles Creek', region: 'North America', lat: 31.5, lng: -91.5 },
  // Plaquemine — Coles Creek successor with growing Mississippian influence, ~1200–1600+ CE, Lower Mississippi Valley
  { culture: 'Plaquemine', region: 'North America', lat: 31.5, lng: -91.4 },
  // Oneota — shell-tempered globular jars, ~900/1000–1700 CE, Upper Midwest river valleys
  { culture: 'Oneota', region: 'North America', lat: 43.0, lng: -91.0 },
  // Fort Ancient — shell temper marks Mississippian contact in later phases, ~1000–1650 CE, Middle Ohio Valley
  { culture: 'Fort Ancient', region: 'North America', lat: 39.0, lng: -84.2 },
  // Deptford — Early Woodland check/simple-stamped ware, ~500 BCE–800 CE, Southeast coast
  { culture: 'Deptford', region: 'North America', lat: 31.5, lng: -82.0 },
  // Swift Creek — Middle Woodland complicated-stamped paddle decoration, ~100/200–800 CE, Georgia/Florida
  { culture: 'Swift Creek', region: 'North America', lat: 31.0, lng: -83.5 },
  // Weeden Island — sculpted/compound mortuary fine wares, ~200/300–1000 CE, Florida Panhandle/Gulf Coast
  { culture: 'Weeden Island', region: 'North America', lat: 30.0, lng: -84.5 },
  // Fremont — thin plain grayware with fugitive red wash, ~400–1350 CE, Utah/eastern Great Basin
  { culture: 'Fremont', region: 'North America', lat: 39.5, lng: -111.5 },
  // Plains Village / Middle Missouri — hybrid Woodland-Mississippian shell-tempered ware, ~1000–1500 CE
  { culture: 'Plains Village / Middle Missouri', region: 'North America', lat: 44.5, lng: -100.5 },
  // Tizon Brown Ware — plain brownware with black fire clouds, southern California/Baja
  { culture: 'Tizon Brown Ware', region: 'North America', lat: 33.5, lng: -116.8 },
  // Owens Valley Brown Ware — coil-and-scrape plain brownware, eastern Sierra Nevada, California
  { culture: 'Owens Valley Brown Ware', region: 'North America', lat: 37.0, lng: -118.2 },

  // ── Mesoamerica ────────────────────────────────────────────────────────────
  { culture: 'Maya', region: 'Mesoamerica', lat: 17.0, lng: -89.5 },
  { culture: 'Aztec / Mexica', region: 'Mesoamerica', lat: 19.4, lng: -99.1 },
  { culture: 'Zapotec', region: 'Mesoamerica', lat: 17.0, lng: -96.7 },
  { culture: 'Mixtec', region: 'Mesoamerica', lat: 17.5, lng: -97.3 },
  { culture: 'Olmec', region: 'Mesoamerica', lat: 18.0, lng: -94.8 },
  { culture: 'Toltec', region: 'Mesoamerica', lat: 19.9, lng: -99.2 },
  { culture: 'Casas Grandes', region: 'Mesoamerica', lat: 30.4, lng: -107.9 },
  // Teotihuacan — Thin Orange ware and cylindrical tripods, ~100 BCE–650 CE, Basin of Mexico
  { culture: 'Teotihuacan', region: 'Mesoamerica', lat: 19.7, lng: -98.8 },
  // Huastec — black-on-cream linear-painted ware, ~1500 BCE–1521 CE, Gulf coast Mexico
  { culture: 'Huastec', region: 'Mesoamerica', lat: 21.5, lng: -98.4 },

  // ── Caribbean / Amazonia ───────────────────────────────────────────────────
  { culture: 'Greater Nicoya', region: 'Caribbean / Amazonia', lat: 10.5, lng: -85.0 },
  { culture: 'Taíno', region: 'Caribbean / Amazonia', lat: 18.5, lng: -70.0 },
  // Gran Coclé — bright polychrome with a named 4-phase style sequence, ~500–1500 CE, central Panama
  { culture: 'Gran Coclé', region: 'Caribbean / Amazonia', lat: 8.4, lng: -80.5 },

  // ── South America ──────────────────────────────────────────────────────────
  { culture: 'Tairona', region: 'South America', lat: 11.0, lng: -73.8 },
  { culture: 'Nazca', region: 'South America', lat: -14.8, lng: -75.0 },
  { culture: 'Moche', region: 'South America', lat: -8.1, lng: -79.0 },
  { culture: 'Chimú', region: 'South America', lat: -8.3, lng: -78.9 },
  { culture: 'Tiwanaku', region: 'South America', lat: -16.5, lng: -68.7 },
  { culture: 'Inca', region: 'South America', lat: -13.5, lng: -72.0 },
  // Chavín — incised monochrome stirrup-spout bottles, ~900–200 BCE, Peru highlands
  { culture: 'Chavín', region: 'South America', lat: -9.6, lng: -77.2 },
  // Cupisnique — burnished monochrome stirrup-spout ware, ~1500–500 BCE, Peru north coast
  { culture: 'Cupisnique', region: 'South America', lat: -7.7, lng: -79.4 },
  // Paracas — post-fire resin-painted ceramics, ~800–100 BCE, Peru south coast
  { culture: 'Paracas', region: 'South America', lat: -13.8, lng: -76.2 },
  // Recuay — kaolin paste with modeled scenes and resist painting, ~1–700 CE, Peru north highlands
  { culture: 'Recuay', region: 'South America', lat: -9.7, lng: -77.4 },
  // Wari / Huari — Staff God iconography, shares kero form with Tiwanaku, ~600–1000 CE, Peru
  { culture: 'Wari', region: 'South America', lat: -13.1, lng: -74.2 },
  // Chancay — loose black-on-white painting, cuchimilco figures, ~1000–1470 CE, Peru central coast
  { culture: 'Chancay', region: 'South America', lat: -11.6, lng: -77.3 },
  // Lambayeque / Sicán — blackware effigy vessels with the Sicán Lord face, ~750–1375 CE, Peru north coast
  { culture: 'Lambayeque / Sicán', region: 'South America', lat: -6.7, lng: -79.8 },

  // ── Europe ─────────────────────────────────────────────────────────────────
  // Neolithic Linear Pottery Culture (~5500 BCE) — earliest European farming pottery
  { culture: 'Neolithic Europe', region: 'Europe', lat: 50.0, lng: 15.0 },
  // Minoan Crete — polychrome marine-style Palace ware, 2600–1100 BCE
  { culture: 'Minoan', region: 'Europe', lat: 35.2, lng: 25.1 },
  // Attic black-figure and red-figure — among the most documented ceramics in history
  { culture: 'Ancient Greece', region: 'Europe', lat: 37.9, lng: 23.7 },
  // Arretine / Terra Sigillata — Roman fine red-gloss tableware, mass-produced empire-wide
  { culture: 'Ancient Rome', region: 'Europe', lat: 41.9, lng: 12.5 },
  // Celtic La Tène — wheel-thrown graphite-decorated wares, 5th–1st c. BCE
  { culture: 'Celtic Europe', region: 'Europe', lat: 47.5, lng: 8.0 },
  // Byzantine polychrome glazed wares and slip-painted ceramics, 4th–15th c. CE
  { culture: 'Byzantine', region: 'Europe', lat: 41.0, lng: 28.9 },
  // Etruscan Bucchero — uniformly black burnished ware from reduction firing, 7th–5th c. BCE, Italy
  { culture: 'Etruscan Bucchero', region: 'Europe', lat: 42.5, lng: 11.9 },
  // Hispano-Moresque Lusterware — tin-glaze plus copper-luster overglaze, 14th–17th c., Spain
  { culture: 'Hispano-Moresque Lusterware', region: 'Europe', lat: 39.5, lng: -0.5 },
  // Delftware — hand-painted cobalt-on-white earthenware imitating Chinese porcelain, 17th c., Netherlands
  { culture: 'Delftware', region: 'Europe', lat: 52.0, lng: 4.36 },
  // English Salt-Glazed Stoneware — pitted "orange peel" glaze from kiln-vaporized salt, 18th c., England
  { culture: 'English Salt-Glazed Stoneware', region: 'Europe', lat: 52.98, lng: -2.13 },

  // ── Africa ─────────────────────────────────────────────────────────────────
  // Ancient Egypt — faience, Nile silt wares, imported Canaanite amphorae
  { culture: 'Ancient Egypt', region: 'Africa', lat: 29.9, lng: 31.1 },
  // Kerma / Nubia — distinctive tulip beakers, classic Kerma ware, 2500–1500 BCE
  { culture: 'Nubian / Kerma', region: 'Africa', lat: 19.6, lng: 30.4 },
  // Nok — earliest sub-Saharan terracotta figurines, 500 BCE–200 CE, Nigeria
  { culture: 'Nok Culture', region: 'Africa', lat: 9.9, lng: 8.5 },
  // Djenné-Jeno — terracotta equestrian and rider figures, 200 BCE–1400 CE, Mali
  { culture: 'Djenné-Jeno', region: 'Africa', lat: 13.9, lng: -4.6 },
  // Ife / Yoruba — naturalistic terracotta and bronze portrait heads, 11th–15th c.
  { culture: 'Ife / Yoruba', region: 'Africa', lat: 7.5, lng: 4.5 },
  // Sao Civilization — large terracotta funerary urns and figurines, Chad Basin
  { culture: 'Sao Civilization', region: 'Africa', lat: 12.0, lng: 15.0 },
  // Great Zimbabwe — graphite-burnished pottery used as a relative dating tool, ~1000–1450 CE
  { culture: 'Great Zimbabwe', region: 'Africa', lat: -20.3, lng: 30.9 },

  // ── Middle East ────────────────────────────────────────────────────────────
  // Halaf — polychrome geometric and zoomorphic painted pottery, 6100–5100 BCE
  { culture: 'Halaf Culture', region: 'Middle East', lat: 36.8, lng: 40.0 },
  // Ubaid — earliest Mesopotamian wheel-thrown wares with painted geometric bands
  { culture: 'Ubaid Culture', region: 'Middle East', lat: 30.5, lng: 47.0 },
  // Sumerian — cylinder-seal impressed wares, mass-produced Jemdet Nasr polychrome
  { culture: 'Sumerian', region: 'Middle East', lat: 31.4, lng: 45.5 },
  // Achaemenid / Persian — rhytons, polychrome glazed tile work, 550–330 BCE
  { culture: 'Achaemenid / Persian', region: 'Middle East', lat: 29.9, lng: 52.9 },
  // Abbasid Islamic Lusterware — metallic tin-glaze luster, 9th–10th c., Iraq/Iran
  { culture: 'Islamic Lusterware', region: 'Middle East', lat: 33.3, lng: 44.4 },
  // Iznik — cobalt-blue and floral polychrome fritware, Ottoman Empire, 15th–17th c.
  { culture: 'Iznik / Ottoman', region: 'Middle East', lat: 40.4, lng: 29.7 },
  // Çatalhöyük / Anatolian Neolithic — buff burnished wares with geometric incision
  { culture: 'Anatolian Neolithic', region: 'Middle East', lat: 37.7, lng: 32.8 },

  // ── South Asia ─────────────────────────────────────────────────────────────
  // Indus Valley / Harappan — wheel-thrown painted red ware with black geometric motifs
  { culture: 'Indus Valley', region: 'South Asia', lat: 27.3, lng: 68.1 },
  // Painted Grey Ware — thin grey wheel-made vessels, early Vedic period, 1100–600 BCE
  { culture: 'Painted Grey Ware', region: 'South Asia', lat: 28.7, lng: 77.1 },
  // Northern Black Polished Ware — mirror-finish luxury ware, 700–200 BCE, Ganges
  { culture: 'N. Black Polished Ware', region: 'South Asia', lat: 25.5, lng: 82.0 },
  // Mauryan — large storage jars, ring wells, NBPW continuation, 322–185 BCE
  { culture: 'Mauryan', region: 'South Asia', lat: 25.6, lng: 85.1 },
  // South Indian Megalithic — black-and-red ware burial pottery, 1200–300 BCE
  { culture: 'South Indian Megalithic', region: 'South Asia', lat: 13.1, lng: 77.6 },

  // ── East Asia ──────────────────────────────────────────────────────────────
  // Yangshao — red-slipped painted Neolithic pottery, spiral and fish motifs, 5000–3000 BCE
  { culture: 'Yangshao Culture', region: 'East Asia', lat: 34.7, lng: 108.7 },
  // Longshan — egg-shell thin black burnished pottery, 3000–1900 BCE, Yellow River
  { culture: 'Longshan Culture', region: 'East Asia', lat: 36.4, lng: 117.0 },
  // Tang Sancai — three-color lead-glazed funerary ware (amber, green, white), 7th–9th c.
  { culture: 'Tang Sancai', region: 'East Asia', lat: 34.7, lng: 112.5 },
  // Jingdezhen — global center of porcelain production; blue-and-white, famille rose
  { culture: 'Jingdezhen Porcelain', region: 'East Asia', lat: 29.3, lng: 117.2 },
  // Jōmon — world's oldest known fired pottery, rope-impressed cord-mark wares, ~14,000 BCE
  { culture: 'Jōmon Culture', region: 'East Asia', lat: 38.0, lng: 140.0 },
  // Goryeo Celadon — jade-green inlaid celadon, considered among finest ceramics ever made
  { culture: 'Goryeo Celadon', region: 'East Asia', lat: 37.0, lng: 126.5 },
  // Ru Ware — rare pale blue-green crackle-glazed imperial stoneware, 1086–1127 CE, Northern Song
  { culture: 'Ru Ware', region: 'East Asia', lat: 34.0, lng: 113.0 },
  // Cizhou Ware — bold black-and-white slip-painted or sgraffito stoneware, Song–Yuan, northern China
  { culture: 'Cizhou Ware', region: 'East Asia', lat: 36.5, lng: 114.5 },
  // Longquan Celadon — thick glossy green-blue glaze, one of history's most widely exported ceramics
  { culture: 'Longquan Celadon', region: 'East Asia', lat: 28.1, lng: 119.1 },

  // ── Southeast Asia ─────────────────────────────────────────────────────────
  // Ban Chiang — painted orange-on-buff Neolithic/Bronze Age pottery, 2100–200 BCE, Thailand
  { culture: 'Ban Chiang', region: 'Southeast Asia', lat: 17.6, lng: 103.2 },
  // Dong Son — Bronze Age painted and incised pottery alongside famous bronze drums, Vietnam
  { culture: 'Dong Son', region: 'Southeast Asia', lat: 20.5, lng: 105.8 },
  // Khmer / Angkor — ash-glazed stoneware, architectural ceramics, 9th–15th c., Cambodia
  { culture: 'Khmer / Angkor', region: 'Southeast Asia', lat: 13.4, lng: 103.9 },
  // Majapahit — earthenware and imported Chinese-influenced glazed stoneware, Java, 13th–15th c.
  { culture: 'Majapahit', region: 'Southeast Asia', lat: -7.6, lng: 111.6 },
  // Sawankhalok / Sukhothai — celadon and iron-painted stoneware trade ware, 13th–16th c., Thailand
  { culture: 'Sawankhalok / Sukhothai', region: 'Southeast Asia', lat: 17.4, lng: 99.8 },

  // ── Oceania ────────────────────────────────────────────────────────────────
  // Lapita — dentate-stamped pottery ancestral to all Polynesian cultures, 1600–500 BCE
  { culture: 'Lapita', region: 'Oceania', lat: -18.0, lng: 168.0 },
  // Fijian Pottery — paddle-and-anvil built, resin-sealed, a rare continuous Pacific tradition
  { culture: 'Fijian Pottery', region: 'Oceania', lat: -17.7, lng: 178.0 },
];
