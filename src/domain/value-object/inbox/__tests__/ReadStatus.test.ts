import { ReadStatus } from '../ReadStatus';

describe('ReadStatus', () => {
    it('should create valid status', () => {
        expect(new ReadStatus(true).getValue()).toBe(true);
        expect(new ReadStatus(false).getValue()).toBe(false);
    });

    it('should throw error for invalid type', () => {
        expect(() => new ReadStatus('true' as any)).toThrow('ReadStatus must be a boolean value');
    });

    it('should create via factory methods', () => {
        expect(ReadStatus.read().getValue()).toBe(true);
        expect(ReadStatus.unread().getValue()).toBe(false);
    });

    it('should create from boolean', () => {
        expect(ReadStatus.fromBoolean(true).getValue()).toBe(true);
        expect(ReadStatus.fromBoolean(false).getValue()).toBe(false);
    });

    it('should check status correctly', () => {
        const read = ReadStatus.read();
        expect(read.isRead()).toBe(true);
        expect(read.isUnread()).toBe(false);
        expect(read.toBoolean()).toBe(true);
        expect(read.toString()).toBe('read');

        const unread = ReadStatus.unread();
        expect(unread.isRead()).toBe(false);
        expect(unread.isUnread()).toBe(true);
        expect(unread.toBoolean()).toBe(false);
        expect(unread.toString()).toBe('unread');
    });

    it('should toggle status', () => {
        const status = ReadStatus.unread();
        const toggled = status.toggle();
        expect(toggled.isRead()).toBe(true);
        expect(toggled.toggle().isUnread()).toBe(true);
    });

    it('should mark as read/unread immutably', () => {
        const status = ReadStatus.unread();
        const read = status.markAsRead();
        expect(read.isRead()).toBe(true);
        expect(status.isUnread()).toBe(true); // Original unchanged

        const unread = read.markAsUnread();
        expect(unread.isUnread()).toBe(true);
    });
});
