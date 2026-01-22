import { Introduction } from '../Introduction';

describe('Introduction', () => {
    it('should create valid introduction', () => {
        const text = 'Hello, I am a user.';
        const intro = Introduction.create(text);
        expect(intro.getValue()).toBe(text);
    });

    it('should accept empty introduction', () => {
        const intro = Introduction.create('');
        expect(intro.getValue()).toBe('');
    });

    it('should throw error for introduction exceeding max length', () => {
        const longText = 'a'.repeat(1001);
        expect(() => Introduction.create(longText)).toThrow('Introduction is too long (maximum 1000 characters)');
    });

    it('should accept introduction with max length', () => {
        const maxText = 'a'.repeat(1000);
        expect(Introduction.create(maxText).getValue()).toBe(maxText);
    });
});
