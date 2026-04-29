/**
 * Search form state — represents the criteria a user submits to search repositories.
 */
export interface SearchCriteria {
  language: string;
  createdAfter?: string; // ISO 8601 date string or undefined
}

/**
 * Mirrors the backend ScoredRepository shape returned in API responses.
 */
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

/**
 * API error shape returned by the backend on 4xx/5xx responses.
 */
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}
