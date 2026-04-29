import { Alert } from '@mui/material';
import type { ApiError } from '../types';

export interface ErrorDisplayProps {
  error: ApiError | null;
}

/**
 * ErrorDisplay renders an error alert when an API error is present.
 * For rate-limit errors (status 429) the reset time embedded in the
 * message is shown so the user knows when to retry.
 * Renders nothing when error is null.
 */
export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) {
    return null;
  }

  return (
    <Alert severity="error" sx={{ mt: 2 }}>
      {error.message}
    </Alert>
  );
}
