export interface Destination {
  id: number;
  slug: string;
  name: string;
  country: string;
  travelType: string;
  shortDescription: string;
  description: string;
  priceFrom: number;
  durationDays: number;
  rating: number;
  featured: boolean;
  imageUrl: string;
  gallery: string[];
  highlights: string[];
}

export interface Activity {
  id: number;
  name: string;
  description: string;
  duration: string;
  included: boolean;
}

export interface Trip {
  id: number;
  title: string;
  departureDate: string;
  returnDate: string;
  price: number;
  seatsTotal: number;
  seatsAvailable: number;
}

export interface DestinationDetail extends Destination {
  activities: Activity[];
  trips: Trip[];
}

export type BudgetValue = 'economique' | 'modere' | 'premium';
export type DestinationSort = 'populaire' | 'prix-asc' | 'prix-desc' | 'note' | 'nom';

export interface DestinationFilters {
  q?: string;
  country?: string;
  type?: string;
  budget?: BudgetValue;
  sort?: DestinationSort;
  featured?: boolean;
}

export interface FilterOptions {
  countries: string[];
  types: string[];
  budgets: { value: BudgetValue; label: string }[];
}
