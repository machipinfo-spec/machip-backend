import { ReadAt } from '../ReadAt';

describe('ReadAt', () => {
    it('should create with valid date', () => {
        const date = new Date('2023-01-01');
        const readAt = new ReadAt(date);
        expect(readAt.getValue()?.getTime()).toBe(date.getTime());
        expect(readAt.isRead()).toBe(true);
    });

    it('should create unread (null)', () => {
        const readAt = new ReadAt(null);
        expect(readAt.getValue()).toBeNull();
        expect(readAt.isUnread()).toBe(true);
    });

    it('should create via factory methods', () => {
        const now = ReadAt.now();
        expect(now.isRead()).toBe(true);
        expect(now.getValue()).toBeInstanceOf(Date);

        const unread = ReadAt.unread();
        expect(unread.isUnread()).toBe(true);
        expect(unread.getValue()).toBeNull();
    });

    it('should create from ISO string', () => {
        const iso = '2023-01-01T10:00:00.000Z';
        expect(ReadAt.fromISOString(iso).toISOString()).toBe(iso);
        expect(ReadAt.fromISOString(null).isUnread()).toBe(true);
    });

    it('should transition state immutably', () => {
        const unread = ReadAt.unread();
        const read = unread.markAsRead();
        expect(read.isRead()).toBe(true);
        expect(unread.isUnread()).toBe(true); // Original unchanged

        const backToUnread = read.markAsUnread();
        expect(backToUnread.isUnread()).toBe(true);
    });

    it('should create read at specific time', () => {
        const time = new Date('2023-02-01');
        const unread = ReadAt.unread();
        const read = unread.readAtTime(time);
        expect(read.getValue()?.getTime()).toBe(time.getTime());
    });
});
