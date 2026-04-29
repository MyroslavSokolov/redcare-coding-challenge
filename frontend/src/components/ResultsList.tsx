import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from '@mui/material';
import type { ScoredRepository } from '../types';

export interface ResultsListProps {
  results: ScoredRepository[];
}

/**
 * ResultsList renders a table of scored repositories.
 * Results are displayed in the order received (sorted by score descending from the backend).
 * Shows a "No repositories found" message when the results array is empty.
 */
export function ResultsList({ results }: ResultsListProps) {
  if (results.length === 0) {
    return (
      <Typography variant="body1" sx={{ mt: 2 }}>
        No repositories found
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right">Stars</TableCell>
            <TableCell align="right">Forks</TableCell>
            <TableCell>Last Updated</TableCell>
            <TableCell align="right">Score</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((repo) => (
            <TableRow key={repo.fullName}>
              <TableCell>
                <a href={repo.url} target="_blank" rel="noopener noreferrer">
                  {repo.name}
                </a>
              </TableCell>
              <TableCell>{repo.description ?? '—'}</TableCell>
              <TableCell align="right">{repo.stars.toLocaleString()}</TableCell>
              <TableCell align="right">{repo.forks.toLocaleString()}</TableCell>
              <TableCell>{new Date(repo.lastUpdated).toLocaleDateString()}</TableCell>
              <TableCell align="right">{repo.score.toFixed(1)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
