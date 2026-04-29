import { useState, type FormEvent } from 'react';
import { Box, Button, TextField } from '@mui/material';
import type { SearchCriteria } from '../types';

export interface SearchFormProps {
  onSearch: (criteria: SearchCriteria) => void;
  isLoading: boolean;
}

/**
 * SearchForm renders language and optional creation-date inputs,
 * validates them client-side, and calls `onSearch` with the criteria.
 */
export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [language, setLanguage] = useState('');
  const [createdAfter, setCreatedAfter] = useState('');
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
      const selected = new Date(createdAfter);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected > today) {
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

    const criteria: SearchCriteria = { language: language.trim() };
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
      <Button type="submit" variant="contained" disabled={isLoading} size="medium" sx={{ mt: '4px' }}>
        Search
      </Button>
    </Box>
  );
}
