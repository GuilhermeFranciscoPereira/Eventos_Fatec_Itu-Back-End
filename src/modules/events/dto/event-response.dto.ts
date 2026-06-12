import { Semester } from '@prisma/client';
import { ParticipantResponseDto } from '../../participants/dto/participant-response.dto';

export class EventResponseDto {
    id!: number;
    name!: string;
    description!: string;
    imageUrl!: string;
    courseId!: number | null;
    courseName!: string | null;
    courseIds!: number[];
    courseNames!: string[];
    semester!: Semester | null;
    maxParticipants!: number;
    currentParticipants!: number;
    isRestricted!: boolean;
    locationId!: number;
    locationName!: string;
    customLocation!: string | null;
    speakerName!: string;
    startDate!: Date;
    endDate!: Date | null;
    startTime!: Date;
    endTime!: Date;
    duration!: number | null;
    categoryId!: number | null;
    createdAt!: Date;
    updatedAt!: Date;
    participants?: ParticipantResponseDto[];
    presenceSecret!: string | null;
}
