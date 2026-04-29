import { useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import type { SearchCriteria, ScoredRepository, ApiError } from '../types';

export interface UseRepositorySearchReturn {
  results: ScoredRepository[];
  isLoading: boolean;
  error: ApiError | null;
  search: (criteria: SearchCriteria) => Promise<void>;
}

/**
 * Custom hook that manages repository search state and API communication.
 *
 * - Sets `isLoading` before the request and clears it on response (success or error).
 * - Parses success responses into `ScoredRepository[]`.
 * - Parses error responses into `ApiError`.
 */
export function useRepositorySearch(): UseRepositorySearchReturn {
  const [results, setResults] = useState<ScoredRepository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const search = useCallback(async (criteria: SearchCriteria): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {
        language: criteria.language,
      };
      if (criteria.createdAfter) {
        params.createdAfter = criteria.createdAfter;
      }

      const response = await axios.get<{ data: ScoredRepository[]; totalCount: number }>(
        '/api/repositories/search',
        { params },
      );

      setResults(response.data.data);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;

      if (axiosError.response?.data) {
        setError(axiosError.response.data);
      } else {
        setError({
          statusCode: 0,
          message: 'Network error. Please check your connection and try again.',
          error: 'Network Error',
        });
      }

      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, isLoading, error, search };
}
