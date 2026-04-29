import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Typography,
} from '@mui/material';
import type { ScoredRepository } from '../types';

enum SortableColumn {
  Name = 'name',
  Stars = 'stars',
  Forks = 'forks',
  LastUpdated = 'lastUpdated',
  Score = 'score',
}

type SortDirection = 'asc' | 'desc';

export interface ResultsListProps {
  results: ScoredRepository[];
}

/**
 * ResultsList renders a sortable table of scored repositories.
 * Clicking a column header sorts by that column; clicking again toggles direction.
 * Default sort is by score descending (matching backend order).
 */
export function ResultsList({ results }: ResultsListProps) {
  const [sortBy, setSortBy] = useState<SortableColumn>(SortableColumn.Score);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortableColumn) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection(column === SortableColumn.Name ? 'asc' : 'desc');
    }
  };

  const sortedResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case SortableColumn.Name:
          comparison = a.name.localeCompare(b.name);
          break;
        case SortableColumn.Stars:
          comparison = a.stars - b.stars;
          break;
        case SortableColumn.Forks:
          comparison = a.forks - b.forks;
          break;
        case SortableColumn.LastUpdated:
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
        case SortableColumn.Score:
          comparison = a.score - b.score;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [results, sortBy, sortDirection]);

  if (results.length === 0) {
    return (
      <Typography variant="body1" sx={{ mt: 2 }}>
        No repositories found
      </Typography>
    );
  }

  const columns: { id: SortableColumn; label: string; align?: 'right' }[] = [
    { id: SortableColumn.Name, label: 'Name' },
    { id: SortableColumn.Stars, label: 'Stars', align: 'right' },
    { id: SortableColumn.Forks, label: 'Forks', align: 'right' },
    { id: SortableColumn.LastUpdated, label: 'Last Updated' },
    { id: SortableColumn.Score, label: 'Score', align: 'right' },
  ];

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="right">#</TableCell>
            {columns.map((col) => (
              <TableCell key={col.id} align={col.align}>
                <TableSortLabel
                  active={sortBy === col.id}
                  direction={sortBy === col.id ? sortDirection : 'asc'}
                  onClick={() => handleSort(col.id)}
                >
                  {col.label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedResults.map((repo, index) => (
            <TableRow key={repo.fullName}>
              <TableCell align="right">{index + 1}</TableCell>
              <TableCell>
                <a href={repo.url} target="_blank" rel="noopener noreferrer">
                  {repo.name}
                </a>
              </TableCell>
              <TableCell align="right">{repo.stars.toLocaleString()}</TableCell>
              <TableCell align="right">{repo.forks.toLocaleString()}</TableCell>
              <TableCell>{new Date(repo.lastUpdated).toLocaleDateString()}</TableCell>
              <TableCell align="right">{repo.score.toFixed(1)}</TableCell>
              <TableCell>{repo.description ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
