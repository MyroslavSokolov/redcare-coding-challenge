import { useState, type FormEvent } from 'react';
import { Box, Button, TextField, MenuItem } from '@mui/material';
import type { SearchCriteria } from '../types';

const PER_PAGE_OPTIONS = [10, 30, 50, 100] as const;

export interface SearchFormProps {
  onSearch: (criteria: SearchCriteria) => void;
  isLoading: boolean;
}

/**
 * SearchForm renders language, optional creation-date, and results-per-page inputs,
 * validates them client-side, and calls `onSearch` with the criteria.
 */
export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [language, setLanguage] = useState('');
  const [createdAfter, setCreatedAfter] = useState('');
  const [perPage, setPerPage] = useState<number>(30);
  const [languageError, setLanguageError] = useState('');
  const [dateError, setDateError] = useState('');

  const validate = (): boolean => {
    let valid = true;

    if (!language.trim()) {
      setLanguageError('Programming language is required');
      valid = false;
    } else {
      setLanguageError('');
    }

    if (createdAfter) {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (createdAfter > todayStr) {
        setDateError('Date must not be in the future');
        valid = false;
      } else {
        setDateError('');
      }
    } else {
      setDateError('');
    }

    return valid;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const criteria: SearchCriteria = { language: language.trim(), perPage };
    if (createdAfter) {
      criteria.createdAfter = createdAfter;
    }
    onSearch(criteria);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <TextField
        label="Programming Language"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        error={!!languageError}
        helperText={languageError}
        required
        size="small"
      />
      <TextField
        label="Earliest Creation Date"
        type="date"
        value={createdAfter}
        onChange={(e) => setCreatedAfter(e.target.value)}
        error={!!dateError}
        helperText={dateError}
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        label="Results"
        select
        value={perPage}
        onChange={(e) => setPerPage(Number(e.target.value))}
        size="small"
        sx={{ minWidth: 100 }}
      >
        {PER_PAGE_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>
            Top {option}
          </MenuItem>
        ))}
      </TextField>
      <Button type="submit" variant="contained" disabled={isLoading} size="medium" sx={{ mt: '4px' }}>
        Search
      </Button>
    </Box>
  );
}
