import { Transform } from 'class-transformer';
import { IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';
import type { CreateEventInput } from '@tabletop/contracts';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export class CreateEventDto implements CreateEventInput {
  @Transform(trim) @IsString() @Length(1, 120) name!: string;
  @IsString() @Length(1, 60) templateId!: string;
  @IsString() @Length(1, 80) format!: string;
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, {
    message: 'Choose a date and time in YYYY-MM-DDTHH:mm format.',
  })
  startsAtLocal!: string;
  @IsInt() @Min(1) @Max(30) capacity!: number;
}
export class RegisterDto {
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
}
