import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { useRepositorySearch } from './useRepositorySearch';
import type { ScoredRepository } from '../types';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const mockRepos: ScoredRepository[] = [
  {
    name: 'repo-a',
    fullName: 'owner/repo-a',
    description: 'A great repo',
    url: 'https://github.com/owner/repo-a',
    stars: 1500,
    forks: 300,
    lastUpdated: '2025-01-15T10:30:00Z',
    score: 87.3,
  },
  {
    name: 'repo-b',
    fullName: 'owner/repo-b',
    description: null,
    url: 'https://github.com/owner/repo-b',
    stars: 500,
    forks: 100,
    lastUpdated: '2024-12-01T00:00:00Z',
    score: 45.1,
  },
];

describe('useRepositorySearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty results, not loading, and no error', () => {
    const { result } = renderHook(() => useRepositorySearch());

    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading to true during a request and false after', async () => {
    let resolveRequest!: (value: unknown) => void;
    mockedAxios.get.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { result } = renderHook(() => useRepositorySearch());

    let searchPromise: Promise<void>;
    act(() => {
      searchPromise = result.current.search({ language: 'typescript' });
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveRequest({ data: { data: [], totalCount: 0 } });
      await searchPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('parses a successful response into ScoredRepository[]', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { data: mockRepos, totalCount: 2 },
    });

    const { result } = renderHook(() => useRepositorySearch());

    await act(async () => {
      await result.current.search({ language: 'typescript' });
    });

    expect(result.current.results).toEqual(mockRepos);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('sends language and createdAfter as query params', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { data: [], totalCount: 0 },
    });

    const { result } = renderHook(() => useRepositorySearch());

    await act(async () => {
      await result.current.search({
        language: 'python',
        createdAfter: '2024-01-01',
      });
    });

    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/api/repositories/search',
      { params: { language: 'python', createdAfter: '2024-01-01' } },
    );
  });

  it('omits createdAfter param when not provided', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { data: [], totalCount: 0 },
    });

    const { result } = renderHook(() => useRepositorySearch());

    await act(async () => {
      await result.current.search({ language: 'go' });
    });

    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/api/repositories/search',
      { params: { language: 'go' } },
    );
  });

  it('parses an API error response into ApiError', async () => {
    const apiError = {
      statusCode: 403,
      message: 'GitHub API rate limit exceeded. Resets at 2025-01-15T12:00:00Z',
      error: 'Forbidden',
    };

    const axiosError = new AxiosError(
      'Request failed with status code 403',
      'ERR_BAD_REQUEST',
    );
    axiosError.response = {
      data: apiError,
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    mockedAxios.get.mockRejectedValue(axiosError);

    const { result } = renderHook(() => useRepositorySearch());

    await act(async () => {
      await result.current.search({ language: 'typescript' });
    });

    expect(result.current.error).toEqual(apiError);
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles network errors with a generic message', async () => {
    const networkError = new AxiosError(
      'Network Error',
      'ERR_NETWORK',
    );

    mockedAxios.get.mockRejectedValue(networkError);

    const { result } = renderHook(() => useRepositorySearch());

    await act(async () => {
      await result.current.search({ language: 'rust' });
    });

    expect(result.current.error).toEqual({
      statusCode: 0,
      message: 'Network error. Please check your connection and try again.',
      error: 'Network Error',
    });
    expect(result.current.results).toEqual([]);
  });

  it('clears previous error on a new successful search', async () => {
    // First call: error
    const networkError = new AxiosError('Network Error', 'ERR_NETWORK');
    mockedAxios.get.mockRejectedValueOnce(networkError);

    const { result } = renderHook(() => useRepositorySearch());

    await act(async () => {
      await result.current.search({ language: 'typescript' });
    });

    expect(result.current.error).not.toBeNull();

    // Second call: success
    mockedAxios.get.mockResolvedValueOnce({
      data: { data: mockRepos, totalCount: 2 },
    });

    await act(async () => {
      await result.current.search({ language: 'typescript' });
    });

    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual(mockRepos);
  });
});
