import { DeliveredAt } from '../DeliveredAt';

describe('DeliveredAt', () => {
    it('should create with valid date', () => {
        const date = new Date('2023-01-01');
        const deliveredAt = new DeliveredAt(date);
        expect(deliveredAt.getValue().getTime()).toBe(date.getTime());
    });

    it('should create now', () => {
        const now = DeliveredAt.now();
        expect(now.getValue()).toBeInstanceOf(Date);
    });

    it('should create from ISO string', () => {
        const iso = '2023-01-01T10:00:00.000Z';
        expect(DeliveredAt.fromISOString(iso).toISOString()).toBe(iso);
    });

    it('should compare dates correctly', () => {
        const early = new DeliveredAt(new Date('2023-01-01'));
        const late = new DeliveredAt(new Date('2023-01-02'));

        expect(early.isBefore(late)).toBe(true);
        expect(late.isAfter(early)).toBe(true);
    });

    it('should add days correctly', () => {
        const date = new Date('2023-01-01');
        const deliveredAt = new DeliveredAt(date);
        const later = deliveredAt.addDays(5);

        const expected = new Date('2023-01-06');
        expect(later.getValue().getTime()).toBe(expected.getTime());
        expect(later).not.toBe(deliveredAt); // Immutable
    });
});
