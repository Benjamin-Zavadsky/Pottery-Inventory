export type Condition = 'Mint' | 'Excellent' | 'Good' | 'Fair' | 'Poor';
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Museum-Grade';
export type Originality =
  | 'Authenticated Original'
  | 'Suspected Original'
  | 'Reproduction'
  | 'Unknown';
export type Status = 'Active' | 'Archived' | 'Deaccessioned';

export interface PotteryItem {
  id: string;
  sku: string;
  date_entered: string;
  date_acquired: string | null;
  location_acquired: string | null;
  name: string;
  use_function: string | null;
  place_of_origin: string;
  age: string;
  dimensions: string | null;
  tribe_culture: string | null;
  appraised_value: number | null;
  acquisition_cost: number | null;
  color: string;
  rarity: Rarity | null;
  museums_comparable: string | null;
  location_in_case: string | null;
  case_id: string | null;
  condition: Condition | null;
  originality: Originality | null;
  seller_donator: string | null;
  provenance: string | null;
  appraisal_date: string | null;
  appraiser_name: string | null;
  status: Status;
  research_notes: string | null;
  description: string | null;
  photos: string[];
  created_at: string;
}

export interface Case {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  last_inventoried_at: string | null;
}

export interface LocationHistory {
  id: string;
  pottery_id: string;
  from_case: string | null;
  to_case: string;
  moved_at: string;
  moved_by: string | null;
  notes: string | null;
}
