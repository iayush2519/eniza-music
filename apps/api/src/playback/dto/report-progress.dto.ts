import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class ReportProgressDto {
  @IsUUID()
  trackId!: string;

  @IsInt()
  @Min(0)
  positionSeconds!: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsBoolean()
  skipped?: boolean;
}
