import { MessageSubject } from '../MessageSubject';

describe('MessageSubject', () => {
    it('should create valid subject', () => {
        const text = 'Hello World';
        expect(new MessageSubject(text).getValue()).toBe(text);
    });

    it('should trim subject', () => {
        expect(new MessageSubject('  Hello  ').getValue()).toBe('Hello');
    });

    it('should throw error if empty', () => {
        expect(() => new MessageSubject('')).toThrow('Message subject cannot be empty');
        expect(() => new MessageSubject('   ')).toThrow('Message subject cannot be empty');
        // also null/undefined but constructor takes string.
    });

    it('should throw error if too long', () => {
        const longText = 'a'.repeat(201);
        expect(() => new MessageSubject(longText)).toThrow('Message subject cannot exceed 200 characters');
    });

    it('should append text', () => {
        const subject = new MessageSubject('Hello');
        const appended = subject.appendText(' World');
        expect(appended.getValue()).toBe('Hello World');
        expect(subject.getValue()).toBe('Hello'); // Immutable
    });

    it('should check contents', () => {
        const subject = new MessageSubject('Hello World');
        expect(subject.startsWith('Hello')).toBe(true);
        expect(subject.endsWith('World')).toBe(true);
        expect(subject.contains('lo Wo')).toBe(true);
        expect(subject.isEmpty()).toBe(false);
    });
});
