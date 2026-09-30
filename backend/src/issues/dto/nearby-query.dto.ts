import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional, Max, Min } from 'class-validator';

const DEFAULT_RADIUS_METERS = 2000;
const MAX_RADIUS_METERS = 50000; // 50km cap to keep the query cheap

export class NearbyQueryDto {
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsLongitude()
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(MAX_RADIUS_METERS)
  radius?: number = DEFAULT_RADIUS_METERS;
}
