import { RecommendationSection } from '@music-app/shared-types';

import { TrackResponseDto } from '../../catalog/dto/track-response.dto';

export class RecommendationSectionResponseDto implements RecommendationSection {
  id!: string;
  title!: string;
  tracks!: TrackResponseDto[];
}
