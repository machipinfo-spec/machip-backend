import { CreatedAt } from '../CreatedAt';

describe('CreatedAt', () => {
    it('should create with valid date', () => {
        const date = new Date('2023-01-01');
        const createdAt = new CreatedAt(date);
        expect(createdAt.getValue().getTime()).toBe(date.getTime());
    });

    it('should throw error for future date', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        expect(() => new CreatedAt(futureDate)).toThrow('CreatedAt cannot be in the future');
    });

    it('should create now', () => {
        const now = CreatedAt.now();
        expect(now.getValue()).toBeInstanceOf(Date);
        // Allow slight difference
        expect(now.getValue().getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should create from ISO string', () => {
        const iso = '2023-01-01T10:00:00.000Z';
        expect(CreatedAt.fromISOString(iso).toISOString()).toBe(iso);
    });

    it('should compare dates correctly', () => {
        const early = new CreatedAt(new Date('2023-01-01'));
        const late = new CreatedAt(new Date('2023-01-02'));

        expect(early.isBefore(late)).toBe(true);
        expect(late.isAfter(early)).toBe(true);
        expect(early.isAfter(late)).toBe(false);
    });

    it('should calculate age correctly', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const createdAt = new CreatedAt(yesterday);

        expect(createdAt.getAgeInDays()).toBeGreaterThanOrEqual(1);
        expect(createdAt.getAgeInHours()).toBeGreaterThanOrEqual(24);
    });
});
