import { SystemMessageContent } from '../SystemMessageContent';

describe('SystemMessageContent', () => {
    it('should create with valid message', () => {
        const content = new SystemMessageContent({ message: 'System alert' });
        expect(content.getMessage()).toBe('System alert');
    });

    it('should throw error for empty message', () => {
        expect(() => new SystemMessageContent({ message: '' })).toThrow('System message content cannot be empty');
    });

    it('should create from JSON', () => {
        const json = JSON.stringify({ message: 'Alert' });
        const content = SystemMessageContent.fromJSON(json);
        expect(content.getMessage()).toBe('Alert');
    });

    it('should get preview', () => {
        const content = new SystemMessageContent({ message: 'Short' });
        expect(content.getPreview()).toBe('Short');

        const longText = 'a'.repeat(200);
        const longContent = new SystemMessageContent({ message: longText });
        expect(longContent.getPreview(100).endsWith('...')).toBe(true);
    });
});
