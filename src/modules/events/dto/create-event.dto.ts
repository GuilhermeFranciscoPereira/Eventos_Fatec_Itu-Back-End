import { Transform } from 'class-transformer'
import { Semester, Location } from '@prisma/client'
import { IsString, IsNotEmpty, MinLength, MaxLength, IsEnum, IsInt, Min, IsBoolean, IsOptional, IsDateString } from 'class-validator'

export class CreateEventDto {
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(140)
    name!: string

    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @IsNotEmpty()
    description!: string

    @IsOptional()
    courseId?: number

    @IsOptional()
    @IsEnum(Semester)
    semester?: Semester

    @IsInt()
    @Min(1)
    maxParticipants!: number

    @IsBoolean()
    isRestricted!: boolean

    @IsEnum(Location)
    location!: Location

    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @MinLength(3)
    @MaxLength(140)
    customLocation?: string

    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(120)
    speakerName!: string

    @IsDateString()
    startDate!: string

    @IsDateString()
    startTime!: string

    @IsDateString()
    endTime!: string

    @IsOptional()
    @IsInt()
    @Min(1)
    duration?: number

    @IsOptional()
    @IsInt()
    @Min(1)
    categoryId?: number
}
