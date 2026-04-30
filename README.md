# GitHub Repository Scorer

A full-stack application that fetches GitHub repositories, computes a popularity score based on multiple signals, and displays ranked results in an interactive UI.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Frontend   │────▶│     Backend      │────▶│   GitHub API   │
│  React + MUI │     │  NestJS + Cache  │     │  Search v3     │
└─────────────┘     └──────────────────┘     └────────────────┘
                           │
                    ┌──────┴──────┐
                    │   Shared    │
                    │   Types     │
                    └─────────────┘
```

- **Frontend** — React 19, Material UI, Vite. Search form with validation, sortable results table.
- **Backend** — NestJS 11, Axios. Fetches from GitHub, scores repositories, caches responses.
- **Shared** — TypeScript interfaces shared via npm workspaces. Single source of truth for API contracts.

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### Install and Run

```bash
# Install all dependencies (root, backend, frontend, shared)
npm install

# Start backend (port 3000)
cd backend
npm run start:dev

# In a separate terminal — start frontend (port 5173)
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### API Documentation

Swagger UI is available at http://localhost:3000/docs when the backend is running.

### Docker (alternative)

```bash
docker compose up --build
```

Open http://localhost:8080 in your browser. Backend runs on port 3000, frontend is served via nginx on port 8080.

### GitHub Token (optional)

The unauthenticated GitHub API allows 10 search requests per minute. To increase this to 30 requests/minute, set a personal access token (no scopes required):

```bash
# Local development
export GITHUB_TOKEN=ghp_your_token_here
cd backend && npm run start:dev

# Docker
GITHUB_TOKEN=ghp_your_token_here docker compose up --build
```

### CORS Origin (optional)

By default, the backend allows requests from `http://localhost:5173` (Vite dev server). To allow other origins:

```bash
export CORS_ORIGIN=http://localhost:5173,https://myapp.com
```

### Run Tests

```bash
# Backend (Jest) — 45 tests
cd backend
npm test

# Frontend (Vitest) — 24 tests
cd frontend
npm test
```

### Linting

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

ESLint 9 with typescript-eslint is configured for both projects.

### CI

GitHub Actions runs lint and tests automatically on every push to `main` and on pull requests. See `.github/workflows/ci.yml`.

## Scoring Algorithm

Each repository receives a popularity score from 0 to 100 using a weighted formula:

```
score = (normalizedStars × 0.5) + (normalizedForks × 0.3) + (normalizedRecency × 0.2)
```

Each factor is normalized to 0–100 relative to the maximum value in the current result batch.

### Weight Rationale

| Factor | Weight | Reasoning |
|--------|--------|-----------|
| Stars | 0.5 | Strongest community signal. A star is a low-friction endorsement of quality, making it the most reliable popularity indicator. |
| Forks | 0.3 | Indicates active development and reuse. Forks represent deeper engagement than stars but are less common. |
| Recency | 0.2 | Rewards actively maintained projects. A recently updated repo is more likely to be relevant, but recency alone does not indicate quality. |

### Normalization

Values are normalized within the current batch using min-max scaling. The repository with the highest value for a factor gets 100; others scale proportionally. This ensures scores are comparable within a result set regardless of absolute magnitudes.

## Features

- **Search filters** — Programming language (required), earliest creation date (optional), result count (10/30/50/100)
- **Sortable table** — Click column headers to sort by name, stars, forks, last updated, or score
- **Row numbering** — Positional ranking that updates with sort order
- **In-memory cache** — 15-minute TTL on GitHub API responses to reduce rate limit pressure
- **Error handling** — Rate limit detection with reset time display, timeout handling, validation errors
- **Shared type library** — Monorepo with npm workspaces, shared interfaces organized by domain

## Project Structure

```
├── shared/                  # Shared TypeScript interfaces
│   └── src/
│       ├── common/          # ApiErrorResponse
│       └── scores/          # ScoredRepository, SearchResult
├── backend/                 # NestJS API server
│   └── src/
│       ├── common/          # Exception filter, TTL cache
│       ├── github/          # GitHub API client, exceptions
│       ├── repository/      # Controller, service, DTO
│       └── scoring/         # Scoring algorithm
├── frontend/                # React + Vite UI
│   └── src/
│       ├── components/      # SearchForm, ResultsList, ErrorDisplay
│       ├── hooks/           # useRepositorySearch
│       └── types/           # Frontend-specific types + re-exports
└── package.json             # npm workspaces root
```

## API

### GET /api/repositories/search

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| language | string | Yes | Programming language filter |
| createdAfter | string | No | ISO 8601 date. Only repos created on or after this date. |
| perPage | number | No | Results per request: 10, 30, 50, or 100. Default: 30. |

**Success response:**
```json
{
  "data": [
    {
      "name": "repo-name",
      "fullName": "owner/repo-name",
      "description": "A description",
      "url": "https://github.com/owner/repo-name",
      "stars": 1500,
      "forks": 300,
      "lastUpdated": "2025-03-10T08:00:00Z",
      "score": 92.5
    }
  ],
  "totalCount": 30
}
```

**Error response:**
```json
{
  "statusCode": 429,
  "message": "GitHub API rate limit exceeded. Resets at 2025-01-15T12:00:00Z",
  "error": "Too Many Requests"
}
```

## Trade-offs and Decisions

### Relative vs Absolute Scoring
Scores are normalized within each batch rather than using absolute thresholds. This means scores are only comparable within the same search result set, not across different searches. The benefit is that results always use the full 0–100 range, making relative ranking intuitive. The downside is that a repo scoring 80 in one search might score differently in another.

### In-Memory Cache vs External Store
The cache lives in process memory with a 15-minute TTL. This is sufficient for a single-instance application and avoids the operational complexity of Redis. In a production multi-instance deployment, you would replace this with a shared cache like Redis.

### GitHub API Rate Limits
The unauthenticated GitHub Search API allows 10 requests per minute. The cache mitigates this, but heavy usage will still hit limits. For higher throughput, configure a GitHub personal access token (30 requests/minute).

### Shared Types Library
Two interfaces were duplicated between frontend and backend. Extracting them into a shared npm workspace package eliminates drift and demonstrates monorepo patterns, at the cost of slightly more build configuration.