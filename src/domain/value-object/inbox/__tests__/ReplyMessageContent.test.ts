import { ReplyMessageContent } from '../ReplyMessageContent';

describe('ReplyMessageContent', () => {
    const validData = {
        ownerThreadId: 't1',
        threadId: 't2',
        content: 'Hello',
        replyUserId: 'u1',
        replyUserName: 'User',
    };

    it('should create with valid data', () => {
        const content = new ReplyMessageContent(validData);
        expect(content.getContent()).toBe('Hello');
        expect(content.getOwnerThreadId()).toBe('t1');
    });

    it('should throw error for empty fields', () => {
        expect(() => new ReplyMessageContent({ ...validData, content: '' })).toThrow(
            'Reply message content cannot be empty',
        );
        expect(() => new ReplyMessageContent({ ...validData, ownerThreadId: '' })).toThrow(
            'Owner thread ID cannot be empty',
        );
    });

    it('should create from JSON', () => {
        const json = JSON.stringify(validData);
        const content = ReplyMessageContent.fromJSON(json);
        expect(content.getContent()).toBe('Hello');
    });

    it('should get preview truncated', () => {
        const longContent = 'a'.repeat(150);
        const content = new ReplyMessageContent({ ...validData, content: longContent });
        expect(content.getPreview(100).length).toBeLessThan(110);
        expect(content.getPreview(100).endsWith('...')).toBe(true);
    });

    it('should search text', () => {
        const content = new ReplyMessageContent(validData);
        expect(content.hasText('Hell')).toBe(true);
        expect(content.hasText('Bye')).toBe(false);
    });
});
