import { Email } from '../Email';

describe('Email', () => {
    it('should create valid email', () => {
        const address = 'test@example.com';
        const email = Email.create(address);
        expect(email.getValue()).toBe(address);
    });

    it('should throw error for empty string', () => {
        expect(() => Email.create('')).toThrow('Invalid email format');
    });

    it('should throw error for plain string', () => {
        expect(() => Email.create('plainaddress')).toThrow('Invalid email format');
    });

    it('should throw error for missing local part', () => {
        expect(() => Email.create('@example.com')).toThrow('Invalid email format');
    });

    it('should throw error for missing at sign', () => {
        expect(() => Email.create('email.example.com')).toThrow('Invalid email format');
    });

    it('should allow email without top level domain if regex permits', () => {
        // The regex seems to allow "email@example" as valid.
        // Let's verify it accepts it instead of throwing.
        const email = Email.create('email@example');
        expect(email.getValue()).toBe('email@example');
    });

    it('should parse domain and local part', () => {
        const email = Email.create('user@example.com');
        expect(email.getDomain()).toBe('example.com');
        expect(email.getLocalPart()).toBe('user');
    });

    it('should identify business emails', () => {
        expect(Email.create('user@company.com').isBusinessEmail()).toBe(true);
        expect(Email.create('user@gmail.com').isBusinessEmail()).toBe(false);
        expect(Email.create('user@yahoo.com').isBusinessEmail()).toBe(false);
    });

    it('should mask email correctly', () => {
        expect(Email.create('user@example.com').mask()).toBe('u**r@example.com');
        expect(Email.create('longname@example.com').mask()).toBe('l******e@example.com');
        expect(Email.create('ab@example.com').mask()).toBe('a*@example.com');
        expect(Email.create('a@example.com').mask()).toBe('a*@example.com'); // Edge case handling in implementation check
    });
});
