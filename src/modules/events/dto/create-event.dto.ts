import { Semester } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsEnum, IsInt, Min, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class CreateEventDto {
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(140)
    name!: string;

    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    courseId?: number;

    @IsOptional()
    @IsEnum(Semester)
    semester?: Semester;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    maxParticipants!: number;

    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    isRestricted!: boolean;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    locationId!: number;

    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @MinLength(3)
    @MaxLength(140)
    customLocation?: string;

    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(120)
    speakerName!: string;

    @IsDateString()
    startDate!: string;

    @IsDateString()
    startTime!: string;

    @IsDateString()
    endTime!: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    duration?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    categoryId?: number;
}