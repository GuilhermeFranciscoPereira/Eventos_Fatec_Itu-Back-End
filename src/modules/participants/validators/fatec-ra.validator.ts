import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

// Fatec RA (Regulamento Geral dos Cursos de Graduação do CPS, Art. 15) as issued by SIGA:
// FFF CCC AA S T NNN -> unit, course, entry year, entry semester (1|2),
// shift (1 morning, 2 afternoon, 3 evening, 4 full-time) and enrollment sequence.
// There is no check digit, so this only rejects numbers that cannot exist.
const RA_PATTERN = /^(\d{3})(\d{3})(\d{2})([12])([1-4])(\d{3})$/;

// Students keep their RA until they graduate or drop out; 20 years covers the maximum
// completion time with plenty of margin.
const MAX_RA_AGE_YEARS = 20;

// Second-semester entrance results are released around June, so no RA for S=2 exists before that.
const SECOND_SEMESTER_FIRST_MONTH = 6;

export function getFatecRaError(ra: string, now: Date = new Date()): string | null {
    if (!/^\d{13}$/.test(ra)) return 'RA deve conter exatamente 13 números.';

    const match = RA_PATTERN.exec(ra);
    if (!match) {
        if (!/[12]/.test(ra[8])) return 'RA inválido: o 9º dígito (semestre de ingresso) deve ser 1 ou 2.';
        return 'RA inválido: o 10º dígito (turno de ingresso) deve ser de 1 a 4.';
    }

    const [, unit, course, year, semester, , sequence] = match;
    if (unit === '000') return 'RA inválido: código da unidade Fatec inexistente.';
    if (course === '000') return 'RA inválido: código do curso inexistente.';
    if (sequence === '000') return 'RA inválido: número de matrícula inexistente.';

    const currentYear = now.getFullYear();
    const entryYear = Math.floor(currentYear / 100) * 100 + Number(year);
    if (entryYear > currentYear) return 'RA inválido: o ano de ingresso (7º e 8º dígitos) está no futuro.';
    if (currentYear - entryYear > MAX_RA_AGE_YEARS) return 'RA inválido: ano de ingresso (7º e 8º dígitos) fora do período aceito.';

    const isFutureSemester = entryYear === currentYear && semester === '2' && now.getMonth() + 1 < SECOND_SEMESTER_FIRST_MONTH;
    if (isFutureSemester) return 'RA inválido: semestre de ingresso ainda não iniciado.';

    return null;
}

export function IsFatecRa(validationOptions?: ValidationOptions): PropertyDecorator {
    return (target: object, propertyName: string | symbol) => {
        registerDecorator({
            name: 'isFatecRa',
            target: target.constructor,
            propertyName: propertyName.toString(),
            options: validationOptions,
            validator: {
                validate: (value: unknown) => typeof value === 'string' && getFatecRaError(value) === null,
                defaultMessage: (args: ValidationArguments) =>
                    typeof args.value === 'string' ? getFatecRaError(args.value) ?? 'RA inválido.' : 'RA deve ser um texto.',
            },
        });
    };
}
