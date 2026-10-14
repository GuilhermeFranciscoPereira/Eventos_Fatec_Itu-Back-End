import { getFatecRaError } from './fatec-ra.validator';

describe('getFatecRaError', () => {
    const now = new Date(2026, 9, 14);

    it.each([
        '0030481321099', // Fatec Sorocaba, ADS, 2013 2nd semester, morning
        '0480482511001',
        '0480482614999', // full-time shift, current year 1st semester
        '0480482623001', // 2nd semester of the current year after June
    ])('accepts %s', (ra) => {
        expect(getFatecRaError(ra, now)).toBeNull();
    });

    it.each([
        ['123', /13 números/],
        ['12345678901ab', /13 números/],
        ['0480482531001', /9º dígito/],
        ['0480482515001', /10º dígito/],
        ['0480482510001', /10º dígito/],
        ['0000482511001', /unidade/],
        ['0480002511001', /curso/],
        ['0480482511000', /matrícula/],
        ['0480482711001', /futuro/],
        ['0480480511001', /fora do período/],
        ['9999999999999', /9º dígito/],
    ])('rejects %s', (ra, expected) => {
        expect(getFatecRaError(ra, now)).toMatch(expected);
    });

    it('rejects a 2nd-semester RA of the current year before June', () => {
        expect(getFatecRaError('0480482623001', new Date(2026, 2, 1))).toMatch(/não iniciado/);
    });
});
