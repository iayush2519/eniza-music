import { Track } from './track';

/**
 * One row of the personalized Home feed — e.g. "Recently played", "For
 * you", `Because you liked "X"`. Mirrors
 * apps/api/src/recommendations/dto/recommendation-section-response.dto.ts
 * exactly; that DTO `implements RecommendationSection` so the backend
 * and this contract can never silently drift.
 */
export type RecommendationSection = {
  id: string;
  title: string;
  tracks: Track[];
};
