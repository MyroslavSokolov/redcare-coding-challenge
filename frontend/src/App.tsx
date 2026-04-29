import { Container, CssBaseline, ThemeProvider, Typography, CircularProgress, Box, createTheme } from '@mui/material';
import { SearchForm } from './components/SearchForm';
import { ResultsList } from './components/ResultsList';
import { ErrorDisplay } from './components/ErrorDisplay';
import { useRepositorySearch } from './hooks/useRepositorySearch';

const theme = createTheme();

function App() {
  const { results, isLoading, error, search } = useRepositorySearch();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          GitHub Repo Scorer
        </Typography>

        <SearchForm onSearch={search} isLoading={isLoading} />

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        <ErrorDisplay error={error} />

        {!isLoading && <ResultsList results={results} />}
      </Container>
    </ThemeProvider>
  );
}

export default App;
