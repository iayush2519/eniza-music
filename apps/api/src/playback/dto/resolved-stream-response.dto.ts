import { ResolvedStream } from '@music-app/shared-types';

export class ResolvedStreamResponseDto implements ResolvedStream {
  url!: string;
  expiresAt!: string | null;
}
