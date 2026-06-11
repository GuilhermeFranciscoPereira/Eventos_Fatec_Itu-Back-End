import { Semester } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsString, IsNotEmpty, MinLength, MaxLength, IsEnum, IsInt, Min, IsBoolean, IsOptional, IsDateString } from 'class-validator';

function toNumberArray(value: unknown): number[] | undefined {
    if (value === undefined || value === null) return undefined;
    if (value === '') return [];

    let rawValues: unknown[];

    if (Array.isArray(value)) {
        rawValues = value;
    } else if (typeof value === 'string' && value.trim().startsWith('[')) {
        try {
            const parsed = JSON.parse(value);
            rawValues = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            rawValues = [value];
        }
    } else if (typeof value === 'string' && value.includes(',')) {
        rawValues = value.split(',');
    } else {
        rawValues = [value];
    }

    return rawValues.map((item) => Number(item));
}

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
    @Min(1)
    courseId?: number;

    @IsOptional()
    @Transform(({ value }) => toNumberArray(value))
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(1, { each: true })
    courseIds?: number[];

    @IsOptional()
    @IsEnum(Semester)
    semester?: Semester;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    maxParticipants!: number;

    @Transform(({ value }) => {
        if (value === true || value === 'true') return true
        if (value === false || value === 'false') return false
        return Boolean(value)
    })
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

    @IsOptional()
    @Transform(({ value }) => {
        if (value === null) return null;
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed || null;
    })
    @IsString()
    @MaxLength(80)
    presenceSecret?: string | null;
}
