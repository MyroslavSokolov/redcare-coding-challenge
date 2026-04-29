import { Injectable } from '@nestjs/common';
import { GitHubRepository } from '../github/interfaces/github-repository.interface';
import { ScoredRepository } from '@github-repo-scorer/shared';

/**
 * ScoringService computes popularity scores for GitHub repositories.
 *
 * Formula: score = (normalizedStars * 0.5) + (normalizedForks * 0.3) + (normalizedRecency * 0.2)
 *
 * Weight rationale:
 * - Stars (0.5): The strongest community signal — a star is a low-friction endorsement
 *   of quality/interest, making it the most reliable popularity indicator.
 * - Forks (0.3): Indicates active development and reuse. Forks represent deeper
 *   engagement than stars but are less common, so weighted slightly lower.
 * - Recency (0.2): Rewards actively maintained projects. A recently updated repo
 *   is more likely to be relevant, but recency alone doesn't indicate quality.
 *
 * Normalization approach:
 * Each factor is normalized to a 0–100 scale relative to the maximum value in the
 * current batch. This ensures scores are comparable within a result set regardless
 * of absolute magnitudes. The repo with the highest value for a factor gets 100;
 * others are scaled proportionally.
 */
@Injectable()
export class ScoringService {
  private static readonly WEIGHT_STARS = 0.5;
  private static readonly WEIGHT_FORKS = 0.3;
  private static readonly WEIGHT_RECENCY = 0.2;

  /**
   * Scores and sorts a batch of repositories by popularity (descending).
   * Returns ScoredRepository[] with all metadata mapped from the raw GitHub objects.
   */
  scoreRepositories(repositories: GitHubRepository[]): ScoredRepository[] {
    if (repositories.length === 0) {
      return [];
    }

    const now = new Date();

    // Compute normalization maxima across the batch
    const maxStars = Math.max(...repositories.map((r) => r.stargazers_count));
    const maxForks = Math.max(...repositories.map((r) => r.forks_count));
    const maxDaysSinceUpdate = Math.max(
      ...repositories.map((r) => this.daysBetween(new Date(r.updated_at), now)),
    );

    // Score each repository and map to the output interface
    const scored: ScoredRepository[] = repositories.map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      lastUpdated: repo.updated_at,
      score: this.computeScore(repo, maxStars, maxForks, maxDaysSinceUpdate, now),
    }));

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }

  /**
   * Computes a single repository's popularity score given pre-computed batch maxima.
   * Pure function — deterministic for the same inputs.
   *
   * @param repo - The repository to score
   * @param maxStars - Maximum stars in the batch (for normalization)
   * @param maxForks - Maximum forks in the batch (for normalization)
   * @param maxDaysSinceUpdate - Maximum days since last update in the batch
   * @param now - Reference date for recency calculation (defaults to current time)
   * @returns Score in [0, 100], rounded to 1 decimal place
   */
  computeScore(
    repo: GitHubRepository,
    maxStars: number,
    maxForks: number,
    maxDaysSinceUpdate: number,
    now: Date = new Date(),
  ): number {
    // Edge case: if all normalization maxima are zero, every repo scores 0.
    // This happens when all repos have 0 stars, 0 forks, and were all updated at the same time.
    if (maxStars === 0 && maxForks === 0 && maxDaysSinceUpdate === 0) {
      return 0;
    }

    // Normalize stars: proportion of batch maximum, scaled to 0–100
    const normalizedStars = maxStars > 0
      ? (repo.stargazers_count / maxStars) * 100
      : 0;

    // Normalize forks: proportion of batch maximum, scaled to 0–100
    const normalizedForks = maxForks > 0
      ? (repo.forks_count / maxForks) * 100
      : 0;

    // Normalize recency: repos updated more recently score higher.
    // Recency = (1 - daysSinceUpdate / maxDaysSinceUpdate) * 100
    // The most recently updated repo gets 100; the least recent gets 0.
    const daysSinceUpdate = this.daysBetween(new Date(repo.updated_at), now);
    const normalizedRecency = maxDaysSinceUpdate > 0
      ? (1 - daysSinceUpdate / maxDaysSinceUpdate) * 100
      : 100; // If all repos updated same day, all get max recency

    // Apply weighted formula
    const rawScore =
      normalizedStars * ScoringService.WEIGHT_STARS +
      normalizedForks * ScoringService.WEIGHT_FORKS +
      normalizedRecency * ScoringService.WEIGHT_RECENCY;

    // Round to 1 decimal place
    return Math.round(rawScore * 10) / 10;
  }

  /**
   * Calculates the number of days between two dates.
   * Returns 0 if the result would be negative (future dates).
   */
  private daysBetween(earlier: Date, later: Date): number {
    const ms = later.getTime() - earlier.getTime();
    return Math.max(0, ms / (1000 * 60 * 60 * 24));
  }
}
