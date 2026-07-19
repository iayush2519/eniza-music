/** Mirrors apps/api/src/playback/dto/report-progress.dto.ts. */
export type ReportProgressRequest = {
  trackId: string;
  positionSeconds: number;
  completed?: boolean;
  skipped?: boolean;
};
