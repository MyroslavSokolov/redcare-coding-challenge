import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ErrorDisplay } from './ErrorDisplay';
import type { ApiError } from '../types';

describe('ErrorDisplay', () => {
  it('renders an error alert with the error message', () => {
    const error: ApiError = {
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };

    render(<ErrorDisplay error={error} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Internal server error')).toBeInTheDocument();
  });

  it('renders nothing when error is null', () => {
    const { container } = render(<ErrorDisplay error={null} />);

    expect(container.innerHTML).toBe('');
  });

  it('displays rate limit error message with reset time', () => {
    const error: ApiError = {
      statusCode: 429,
      message: 'GitHub API rate limit exceeded. Resets at 2025-01-15T12:00:00Z',
      error: 'Too Many Requests',
    };

    render(<ErrorDisplay error={error} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText(/rate limit exceeded.*resets at/i),
    ).toBeInTheDocument();
  });

  it('renders alert with error severity', () => {
    const error: ApiError = {
      statusCode: 400,
      message: 'Bad request',
      error: 'Bad Request',
    };

    render(<ErrorDisplay error={error} />);

    const alert = screen.getByRole('alert');
    // MUI Alert with severity="error" adds the MuiAlert-standardError class
    expect(alert).toHaveClass('MuiAlert-standardError');
  });
});
