import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SearchForm } from './SearchForm';

describe('SearchForm', () => {
  it('renders language input, date input, and submit button', () => {
    render(<SearchForm onSearch={vi.fn()} isLoading={false} />);

    expect(screen.getByLabelText(/programming language/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/earliest creation date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('shows validation message when language is empty on submit', () => {
    const onSearch = vi.fn();
    render(<SearchForm onSearch={onSearch} isLoading={false} />);

    // Use fireEvent.submit to bypass native HTML required validation in jsdom
    fireEvent.submit(screen.getByRole('button', { name: /search/i }));

    expect(screen.getByText(/programming language is required/i)).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('shows validation message when a future date is entered', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchForm onSearch={onSearch} isLoading={false} />);

    await user.type(screen.getByLabelText(/programming language/i), 'typescript');

    // Set a future date via fireEvent since userEvent.type on date inputs is unreliable
    fireEvent.change(screen.getByLabelText(/earliest creation date/i), {
      target: { value: '2099-12-31' },
    });

    fireEvent.submit(screen.getByRole('button', { name: /search/i }));

    expect(screen.getByText(/date must not be in the future/i)).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('disables submit button when isLoading is true', () => {
    render(<SearchForm onSearch={vi.fn()} isLoading={true} />);

    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
  });

  it('calls onSearch with criteria when form is valid', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchForm onSearch={onSearch} isLoading={false} />);

    await user.type(screen.getByLabelText(/programming language/i), 'python');

    fireEvent.submit(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith({ language: 'python', perPage: 30 });
  });
});
