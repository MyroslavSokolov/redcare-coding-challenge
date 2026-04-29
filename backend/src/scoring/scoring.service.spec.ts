import * as fc from 'fast-check';
import { ScoringService } from './scoring.service';
import { GitHubRepository } from '../github/interfaces/github-repository.interface';

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    service = new ScoringService();
  });

  /**
   * fast-check arbitrary that generates a random GitHubRepository with
   * non-negative stars/forks and valid ISO 8601 dates between 2008 and now.
   *
   * Uses integer timestamps to avoid fc.date() edge cases with invalid Date objects.
   */
  const minTimestamp = new Date('2008-01-01').getTime();
  const maxTimestamp = Date.now();

  const arbISODate = fc
    .integer({ min: minTimestamp, max: maxTimestamp })
    .map((ts) => new Date(ts).toISOString());

  const arbGitHubRepository: fc.Arbitrary<GitHubRepository> = fc.record({
    id: fc.nat(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    full_name: fc.string({ minLength: 3, maxLength: 100 }),
    description: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    html_url: fc.constant('https://github.com/test/repo'),
    stargazers_count: fc.nat({ max: 500_000 }),
    forks_count: fc.nat({ max: 100_000 }),
    updated_at: arbISODate,
    created_at: arbISODate,
  });

  /** Generator for a non-empty array of repositories (1–50 items). */
  const arbRepositoryArray = fc.array(arbGitHubRepository, {
    minLength: 1,
    maxLength: 50,
  });

  describe('Feature: github-repo-scorer, Property 1: Bounded Score Output', () => {
    it('computeScore always returns a value in [0, 100] for any valid repository', () => {
      const now = new Date();

      fc.assert(
        fc.property(
          arbGitHubRepository,
          fc.nat({ max: 500_000 }),
          fc.nat({ max: 100_000 }),
          fc.nat({ max: 10_000 }),
          (repo, extraStars, extraForks, extraDays) => {
            // Maxima must be >= the repo's own values (as they would be in a real
            // batch). We add a random extra amount on top to simulate other repos
            // in the batch having higher values.
            const effectiveMaxStars = repo.stargazers_count + extraStars;
            const effectiveMaxForks = repo.forks_count + extraForks;

            const daysSinceUpdate = Math.max(
              0,
              (now.getTime() - new Date(repo.updated_at).getTime()) /
                (1000 * 60 * 60 * 24),
            );
            const effectiveMaxDays = daysSinceUpdate + extraDays;

            const score = service.computeScore(
              repo,
              effectiveMaxStars,
              effectiveMaxForks,
              effectiveMaxDays,
              now,
            );

            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Feature: github-repo-scorer, Property 2: Monotonic Descending Sort', () => {
    it('scoreRepositories returns scores in monotonically descending order for any valid repository array', () => {
      fc.assert(
        fc.property(arbRepositoryArray, (repos) => {
          const scored = service.scoreRepositories(repos);

          // Every consecutive pair must satisfy score[i] >= score[i+1]
          for (let i = 0; i < scored.length - 1; i++) {
            expect(scored[i].score).toBeGreaterThanOrEqual(scored[i + 1].score);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Validates: Requirements 3.2**
   *
   * Property 3: Monotonic Factor Influence (Stars)
   * For any two repositories identical except that one has strictly more stars,
   * the repo with more stars must have a score >= the other when scored in the
   * same batch.
   */
  describe('Feature: github-repo-scorer, Property 3: Monotonic Factor Influence', () => {
    it('a repo with strictly more stars scores >= an otherwise identical repo within the same batch', () => {
      fc.assert(
        fc.property(
          arbGitHubRepository,
          fc.integer({ min: 1, max: 500_000 }),
          (baseRepo, extraStars) => {
            // Create a second repo identical to the first but with more stars
            const moreStarsRepo: GitHubRepository = {
              ...baseRepo,
              stargazers_count: baseRepo.stargazers_count + extraStars,
            };

            // Score both repos in the same batch
            const scored = service.scoreRepositories([baseRepo, moreStarsRepo]);

            // Find scored results by stars count (the repo with more stars is unique
            // because extraStars >= 1)
            const baseScored = scored.find(
              (r) => r.stars === baseRepo.stargazers_count,
            );
            const moreStarsScored = scored.find(
              (r) => r.stars === moreStarsRepo.stargazers_count,
            );

            expect(baseScored).toBeDefined();
            expect(moreStarsScored).toBeDefined();
            expect(moreStarsScored!.score).toBeGreaterThanOrEqual(
              baseScored!.score,
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * Property 4: Normalization Ceiling
   * For any non-empty array of GitHubRepository objects where at least one
   * repository has a non-zero value for a given factor (stars, forks, or recency),
   * the repository with the maximum value for that factor SHALL have that factor
   * normalized to exactly 100.
   *
   * We verify this indirectly through computeScore: when a repo holds the max
   * value for a factor, that factor's normalized contribution is 100. We compute
   * the expected score with that factor set to 100 and compare.
   */
  describe('Feature: github-repo-scorer, Property 4: Normalization Ceiling', () => {
    it('the repo with the max value for stars has that factor normalized to exactly 100', () => {
      fc.assert(
        fc.property(
          arbRepositoryArray.filter((repos) =>
            repos.some((r) => r.stargazers_count > 0),
          ),
          (repos) => {
            const now = new Date();
            const maxStars = Math.max(
              ...repos.map((r) => r.stargazers_count),
            );
            const maxForks = Math.max(...repos.map((r) => r.forks_count));
            const maxDaysSinceUpdate = Math.max(
              ...repos.map((r) => {
                const ms =
                  now.getTime() - new Date(r.updated_at).getTime();
                return Math.max(0, ms / (1000 * 60 * 60 * 24));
              }),
            );

            // Find a repo with the max stars
            const maxStarsRepo = repos.find(
              (r) => r.stargazers_count === maxStars,
            )!;

            // Compute its score via the service
            const score = service.computeScore(
              maxStarsRepo,
              maxStars,
              maxForks,
              maxDaysSinceUpdate,
              now,
            );

            // Compute expected score with normalizedStars = 100 (ceiling)
            const normalizedStars = 100;
            const normalizedForks =
              maxForks > 0
                ? (maxStarsRepo.forks_count / maxForks) * 100
                : 0;
            const daysSinceUpdate = Math.max(
              0,
              (now.getTime() -
                new Date(maxStarsRepo.updated_at).getTime()) /
                (1000 * 60 * 60 * 24),
            );
            const normalizedRecency =
              maxDaysSinceUpdate > 0
                ? (1 - daysSinceUpdate / maxDaysSinceUpdate) * 100
                : 100;

            const expectedScore =
              Math.round(
                (normalizedStars * 0.5 +
                  normalizedForks * 0.3 +
                  normalizedRecency * 0.2) *
                  10,
              ) / 10;

            expect(score).toBe(expectedScore);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('the repo with the max value for forks has that factor normalized to exactly 100', () => {
      fc.assert(
        fc.property(
          arbRepositoryArray.filter((repos) =>
            repos.some((r) => r.forks_count > 0),
          ),
          (repos) => {
            const now = new Date();
            const maxStars = Math.max(
              ...repos.map((r) => r.stargazers_count),
            );
            const maxForks = Math.max(...repos.map((r) => r.forks_count));
            const maxDaysSinceUpdate = Math.max(
              ...repos.map((r) => {
                const ms =
                  now.getTime() - new Date(r.updated_at).getTime();
                return Math.max(0, ms / (1000 * 60 * 60 * 24));
              }),
            );

            // Find a repo with the max forks
            const maxForksRepo = repos.find(
              (r) => r.forks_count === maxForks,
            )!;

            const score = service.computeScore(
              maxForksRepo,
              maxStars,
              maxForks,
              maxDaysSinceUpdate,
              now,
            );

            // Compute expected score with normalizedForks = 100 (ceiling)
            const normalizedStars =
              maxStars > 0
                ? (maxForksRepo.stargazers_count / maxStars) * 100
                : 0;
            const normalizedForks = 100;
            const daysSinceUpdate = Math.max(
              0,
              (now.getTime() -
                new Date(maxForksRepo.updated_at).getTime()) /
                (1000 * 60 * 60 * 24),
            );
            const normalizedRecency =
              maxDaysSinceUpdate > 0
                ? (1 - daysSinceUpdate / maxDaysSinceUpdate) * 100
                : 100;

            const expectedScore =
              Math.round(
                (normalizedStars * 0.5 +
                  normalizedForks * 0.3 +
                  normalizedRecency * 0.2) *
                  10,
              ) / 10;

            expect(score).toBe(expectedScore);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('the most recently updated repo has recency normalized to exactly 100', () => {
      fc.assert(
        fc.property(
          arbRepositoryArray.filter((repos) => {
            const now = new Date();
            const days = repos.map((r) =>
              Math.max(
                0,
                (now.getTime() - new Date(r.updated_at).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            );
            // Need at least some difference in recency so maxDaysSinceUpdate > 0
            return Math.max(...days) > 0;
          }),
          (repos) => {
            const now = new Date();
            const maxStars = Math.max(
              ...repos.map((r) => r.stargazers_count),
            );
            const maxForks = Math.max(...repos.map((r) => r.forks_count));

            const daysArray = repos.map((r) => {
              const ms =
                now.getTime() - new Date(r.updated_at).getTime();
              return Math.max(0, ms / (1000 * 60 * 60 * 24));
            });
            const maxDaysSinceUpdate = Math.max(...daysArray);

            // The most recently updated repo has the smallest daysSinceUpdate
            const minDaysIndex = daysArray.indexOf(
              Math.min(...daysArray),
            );
            const mostRecentRepo = repos[minDaysIndex];

            const score = service.computeScore(
              mostRecentRepo,
              maxStars,
              maxForks,
              maxDaysSinceUpdate,
              now,
            );

            // Compute expected score with normalizedRecency at ceiling
            const normalizedStars =
              maxStars > 0
                ? (mostRecentRepo.stargazers_count / maxStars) * 100
                : 0;
            const normalizedForks =
              maxForks > 0
                ? (mostRecentRepo.forks_count / maxForks) * 100
                : 0;
            const minDays = Math.min(...daysArray);
            const normalizedRecency =
              maxDaysSinceUpdate > 0
                ? (1 - minDays / maxDaysSinceUpdate) * 100
                : 100;

            const expectedScore =
              Math.round(
                (normalizedStars * 0.5 +
                  normalizedForks * 0.3 +
                  normalizedRecency * 0.2) *
                  10,
              ) / 10;

            expect(score).toBe(expectedScore);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Validates: Requirements 4.3**
   *
   * Property 5: Score Rounding Precision
   * For any computed Popularity_Score, the final value SHALL have at most
   * one digit after the decimal point.
   *
   * We test this at two levels:
   * 1. computeScore with random inputs — the raw scoring path
   * 2. scoreRepositories with random batches — the full pipeline path
   */
  describe('Feature: github-repo-scorer, Property 5: Score Rounding Precision', () => {
    it('computeScore always returns a value with at most 1 decimal place', () => {
      const now = new Date();

      fc.assert(
        fc.property(
          arbGitHubRepository,
          fc.nat({ max: 500_000 }),
          fc.nat({ max: 100_000 }),
          fc.nat({ max: 10_000 }),
          (repo, extraStars, extraForks, extraDays) => {
            const effectiveMaxStars = repo.stargazers_count + extraStars;
            const effectiveMaxForks = repo.forks_count + extraForks;
            const daysSinceUpdate = Math.max(
              0,
              (now.getTime() - new Date(repo.updated_at).getTime()) /
                (1000 * 60 * 60 * 24),
            );
            const effectiveMaxDays = daysSinceUpdate + extraDays;

            const score = service.computeScore(
              repo,
              effectiveMaxStars,
              effectiveMaxForks,
              effectiveMaxDays,
              now,
            );

            // Multiply by 10 — if properly rounded to 1 decimal, the result is an integer
            expect(Number.isInteger(Math.round(score * 10))).toBe(true);
            // Also verify via string: at most 1 digit after the decimal point
            const decimalPart = score.toString().split('.')[1];
            expect(
              decimalPart === undefined || decimalPart.length <= 1,
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('scoreRepositories returns scores with at most 1 decimal place for every repo in the batch', () => {
      fc.assert(
        fc.property(arbRepositoryArray, (repos) => {
          const scored = service.scoreRepositories(repos);

          for (const result of scored) {
            const decimalPart = result.score.toString().split('.')[1];
            expect(
              decimalPart === undefined || decimalPart.length <= 1,
            ).toBe(true);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Unit Tests (example-based)
   *
   * Validates: Requirements 9.1, 3.1, 3.2, 3.4
   *
   * These tests verify specific, hand-computed input/output pairs and edge cases
   * for the ScoringService.
   */
  describe('Unit Tests', () => {
    // Fixed reference date for deterministic tests
    const NOW = new Date('2025-01-20T00:00:00.000Z');

    /** Helper to build a GitHubRepository with sensible defaults. */
    function makeRepo(overrides: Partial<GitHubRepository> = {}): GitHubRepository {
      return {
        id: 1,
        name: 'test-repo',
        full_name: 'owner/test-repo',
        description: 'A test repository',
        html_url: 'https://github.com/owner/test-repo',
        stargazers_count: 0,
        forks_count: 0,
        updated_at: NOW.toISOString(),
        created_at: '2024-01-01T00:00:00.000Z',
        ...overrides,
      };
    }

    describe('computeScore — known input/output pairs', () => {
      it('computes the correct score for a repo that is the batch maximum', () => {
        // Repo IS the max for all factors: normalizedStars=100, normalizedForks=100, normalizedRecency=100
        // Score = 100*0.5 + 100*0.3 + 100*0.2 = 50 + 30 + 20 = 100.0
        const repo = makeRepo({
          stargazers_count: 1000,
          forks_count: 500,
          updated_at: NOW.toISOString(), // 0 days ago
        });

        const score = service.computeScore(repo, 1000, 500, 10, NOW);
        expect(score).toBe(100.0);
      });

      it('computes the correct score for a repo with partial values', () => {
        // Repo: 200 stars, 80 forks, updated 3 days ago
        // maxStars=400, maxForks=100, maxDaysSinceUpdate=30
        // normalizedStars = (200/400)*100 = 50
        // normalizedForks = (80/100)*100 = 80
        // normalizedRecency = (1 - 3/30)*100 = 90
        // Score = 50*0.5 + 80*0.3 + 90*0.2 = 25 + 24 + 18 = 67.0
        const threeDaysAgo = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const repo = makeRepo({
          stargazers_count: 200,
          forks_count: 80,
          updated_at: threeDaysAgo,
        });

        const score = service.computeScore(repo, 400, 100, 30, NOW);
        expect(score).toBe(67.0);
      });

      it('computes the correct score for a repo at the bottom of the batch', () => {
        // Repo: 0 stars, 0 forks, updated 30 days ago (the oldest in batch)
        // maxStars=400, maxForks=100, maxDaysSinceUpdate=30
        // normalizedStars = 0, normalizedForks = 0, normalizedRecency = (1 - 30/30)*100 = 0
        // Score = 0*0.5 + 0*0.3 + 0*0.2 = 0.0
        const thirtyDaysAgo = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const repo = makeRepo({
          stargazers_count: 0,
          forks_count: 0,
          updated_at: thirtyDaysAgo,
        });

        const score = service.computeScore(repo, 400, 100, 30, NOW);
        expect(score).toBe(0);
      });

      it('computes the correct score when maxDaysSinceUpdate is 0 (all repos updated same time)', () => {
        // When maxDaysSinceUpdate=0, normalizedRecency=100 for all repos
        // Repo: 50 stars, 25 forks, updated at NOW
        // maxStars=100, maxForks=50, maxDaysSinceUpdate=0
        // normalizedStars = (50/100)*100 = 50
        // normalizedForks = (25/50)*100 = 50
        // normalizedRecency = 100 (special case)
        // Score = 50*0.5 + 50*0.3 + 100*0.2 = 25 + 15 + 20 = 60.0
        const repo = makeRepo({
          stargazers_count: 50,
          forks_count: 25,
          updated_at: NOW.toISOString(),
        });

        const score = service.computeScore(repo, 100, 50, 0, NOW);
        expect(score).toBe(60.0);
      });
    });

    describe('computeScore — edge case: all-zero repository', () => {
      it('returns score 0 when all normalization maxima are zero', () => {
        // All repos have 0 stars, 0 forks, and were updated at the same time
        // maxStars=0, maxForks=0, maxDaysSinceUpdate=0 → score = 0
        const repo = makeRepo({
          stargazers_count: 0,
          forks_count: 0,
          updated_at: NOW.toISOString(),
        });

        const score = service.computeScore(repo, 0, 0, 0, NOW);
        expect(score).toBe(0);
      });
    });

    describe('scoreRepositories — single repository in batch', () => {
      it('scores a single repo with a past updated_at correctly', () => {
        // For a single repo, it is the batch max for stars and forks.
        // normalizedStars = 100, normalizedForks = 100
        // Since scoreRepositories uses new Date() internally and updated_at is in the past,
        // maxDaysSinceUpdate > 0 and equals the repo's own daysSinceUpdate,
        // so normalizedRecency = (1 - days/days)*100 = 0
        // Score = 100*0.5 + 100*0.3 + 0*0.2 = 50 + 30 + 0 = 80.0
        const repo = makeRepo({
          stargazers_count: 500,
          forks_count: 200,
          updated_at: '2024-06-01T00:00:00.000Z',
        });

        const result = service.scoreRepositories([repo]);

        expect(result).toHaveLength(1);
        expect(result[0].score).toBe(80);
        expect(result[0].name).toBe('test-repo');
        expect(result[0].fullName).toBe('owner/test-repo');
        expect(result[0].stars).toBe(500);
        expect(result[0].forks).toBe(200);
      });

      it('scores a single all-zero repo as 0', () => {
        const repo = makeRepo({
          stargazers_count: 0,
          forks_count: 0,
          updated_at: NOW.toISOString(),
        });

        const result = service.scoreRepositories([repo]);

        expect(result).toHaveLength(1);
        expect(result[0].score).toBe(0);
      });
    });

    describe('scoreRepositories — descending sort order', () => {
      it('returns results sorted by score in descending order', () => {
        // Create repos with clearly different scores.
        // Use the same updated_at so recency doesn't vary — focus on stars/forks.
        const updatedAt = '2025-01-10T00:00:00.000Z';

        const lowRepo = makeRepo({
          id: 1,
          name: 'low-score',
          full_name: 'owner/low-score',
          stargazers_count: 10,
          forks_count: 5,
          updated_at: updatedAt,
        });

        const midRepo = makeRepo({
          id: 2,
          name: 'mid-score',
          full_name: 'owner/mid-score',
          stargazers_count: 500,
          forks_count: 200,
          updated_at: updatedAt,
        });

        const highRepo = makeRepo({
          id: 3,
          name: 'high-score',
          full_name: 'owner/high-score',
          stargazers_count: 1000,
          forks_count: 400,
          updated_at: updatedAt,
        });

        // Pass in scrambled order to verify sorting
        const result = service.scoreRepositories([lowRepo, highRepo, midRepo]);

        expect(result).toHaveLength(3);
        // Verify descending order
        expect(result[0].name).toBe('high-score');
        expect(result[2].name).toBe('low-score');
        expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
        expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
      });

      it('returns an empty array for empty input', () => {
        const result = service.scoreRepositories([]);
        expect(result).toEqual([]);
      });
    });
  });
});
