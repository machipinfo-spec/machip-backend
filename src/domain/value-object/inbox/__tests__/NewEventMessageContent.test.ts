import { NewEventMessageContent } from '../NewEventMessageContent';

describe('NewEventMessageContent', () => {
    const validData = {
        pointInfoId: 'p1',
        ownerUserId: 'u1',
        address: 'Tokyo',
        title: 'Event',
        date: new Date('2023-01-01'),
    };

    it('should create with valid data', () => {
        const content = new NewEventMessageContent(validData);
        expect(content.getPointInfoId()).toBe('p1');
        expect(content.getAddress()).toBe('Tokyo');
        expect(content.toJSON()).toContain('Tokyo');
    });

    it('should throw error for empty required fields', () => {
        expect(() => new NewEventMessageContent({ ...validData, pointInfoId: '' })).toThrow(
            'Point info ID cannot be empty',
        );
        expect(() => new NewEventMessageContent({ ...validData, ownerUserId: '' })).toThrow(
            'Owner user ID cannot be empty',
        );
        expect(() => new NewEventMessageContent({ ...validData, address: '' })).toThrow('Address cannot be empty');
    });

    it('should create from JSON', () => {
        const json = JSON.stringify(validData);
        const content = NewEventMessageContent.fromJSON(json);
        expect(content.getPointInfoId()).toBe('p1');
    });

    it('should handle invalid JSON', () => {
        expect(() => NewEventMessageContent.fromJSON('{invalid')).toThrow(
            /Failed to parse NewEventMessageContent from JSON/,
        );
    });

    it('should create via factory', () => {
        const content = NewEventMessageContent.create('p1', 'u1', 'Tokyo', 'Event', new Date());
        expect(content.getPointInfoId()).toBe('p1');
    });
});
