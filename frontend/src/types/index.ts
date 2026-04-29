export type { ScoredRepository, ApiErrorResponse } from '@github-repo-scorer/shared';

/**
 * Search form state — represents the criteria a user submits to search repositories.
 */
export interface SearchCriteria {
  language: string;
  createdAfter?: string; // ISO 8601 date string or undefined
  perPage?: number;
}
