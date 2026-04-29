export interface ScoredRepository {
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  lastUpdated: string;
  score: number;
}

export interface SearchResult {
  data: ScoredRepository[];
  totalCount: number;
}
