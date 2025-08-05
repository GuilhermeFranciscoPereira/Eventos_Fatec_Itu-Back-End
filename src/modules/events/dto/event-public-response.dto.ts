import { Course, Semester, Location } from '@prisma/client';

export class EventPublicResponseDto {
    id!: number;
    name!: string;
    description!: string;
    imageUrl!: string;
    course!: Course;
    semester!: Semester | null;
    maxParticipants!: number;
    currentParticipants!: number;
    isRestricted!: boolean;
    location!: Location;
    customLocation: string | null;
    speakerName!: string;
    startDate!: Date;
    startTime!: Date;
    endTime!: Date;
    duration: number | null;
    categoryId: number | null;
}
