import { IsBoolean } from 'class-validator';

export class UpdateParticipantDto {
    @IsBoolean({ message: 'isPresent deve ser true ou false' })
    isPresent!: boolean;
}
