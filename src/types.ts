export interface Product {
  name: string;
  brand?: string;
  category: string;
  item: string;
  website?: string;
  reason?: string;
  notes?: string;
  is_recommender?: boolean;
}

export interface Store {
  name: string;
  category: string;
  description: string;
  website: string;
}

export interface Singer {
  name: string;
  notes?: string;
  is_recommender?: boolean;
}

export interface Actor {
  name: string;
  notes?: string;
  is_recommender?: boolean;
}

export interface Artist {
  name: string;
  notes?: string;
  is_recommender?: boolean;
}

export interface MiscCreator {
  name?: string;
  website?: string;
  notes?: string;
  is_recommender?: boolean;
}
