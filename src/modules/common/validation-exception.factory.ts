import { BadRequestException, ValidationError } from '@nestjs/common';

// Same response shape as Nest's default factory, but the built-in English messages
// (unknown fields, nested objects) are replaced with pt-BR ones shown to the user.
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
    const messages: string[] = [];

    const collect = (error: ValidationError, parentPath: string): void => {
        const path = parentPath ? `${parentPath}.${error.property}` : error.property;
        for (const [constraint, message] of Object.entries(error.constraints ?? {})) {
            messages.push(constraint === 'whitelistValidation' ? `O campo "${path}" não é permitido.` : message);
        }
        error.children?.forEach((child) => collect(child, path));
    };

    errors.forEach((error) => collect(error, ''));
    return new BadRequestException(messages);
}
