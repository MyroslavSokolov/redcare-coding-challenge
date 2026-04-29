import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ResultsList } from './ResultsList';
import type { ScoredRepository } from '../types';

const mockResults: ScoredRepository[] = [
  {
    name: 'repo-alpha',
    fullName: 'owner/repo-alpha',
    description: 'An alpha repository',
    url: 'https://github.com/owner/repo-alpha',
    stars: 2000,
    forks: 500,
    lastUpdated: '2025-03-10T08:00:00Z',
    score: 92.5,
  },
  {
    name: 'repo-beta',
    fullName: 'owner/repo-beta',
    description: null,
    url: 'https://github.com/owner/repo-beta',
    stars: 800,
    forks: 120,
    lastUpdated: '2024-11-20T12:00:00Z',
    score: 54.3,
  },
];

describe('ResultsList', () => {
  it('renders all required column headers', () => {
    render(<ResultsList results={mockResults} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Stars')).toBeInTheDocument();
    expect(screen.getByText('Forks')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
  });

  it('renders repository data correctly', () => {
    render(<ResultsList results={mockResults} />);

    // First repo
    expect(screen.getByText('repo-alpha')).toBeInTheDocument();
    expect(screen.getByText('An alpha repository')).toBeInTheDocument();
    expect(screen.getByText('92.5')).toBeInTheDocument();

    // Second repo — null description renders as em dash
    expect(screen.getByText('repo-beta')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('54.3')).toBeInTheDocument();
  });

  it('renders repository names as links', () => {
    render(<ResultsList results={mockResults} />);

    const link = screen.getByRole('link', { name: 'repo-alpha' });
    expect(link).toHaveAttribute('href', 'https://github.com/owner/repo-alpha');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows empty state message when results array is empty', () => {
    render(<ResultsList results={[]} />);

    expect(screen.getByText(/no repositories found/i)).toBeInTheDocument();
  });

  it('does not render a table when results are empty', () => {
    render(<ResultsList results={[]} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('displays score rounded to 1 decimal place', () => {
    render(<ResultsList results={mockResults} />);

    // 92.5 and 54.3 are already 1 decimal — verify they render as-is
    expect(screen.getByText('92.5')).toBeInTheDocument();
    expect(screen.getByText('54.3')).toBeInTheDocument();
  });
});
