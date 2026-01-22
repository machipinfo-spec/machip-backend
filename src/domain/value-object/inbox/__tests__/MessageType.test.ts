import { MessageType } from '../MessageType';

describe('MessageType', () => {
    it('should create valid types', () => {
        expect(new MessageType('system').getValue()).toBe('system');
        expect(new MessageType('ai').getValue()).toBe('ai');
        expect(new MessageType('reply').getValue()).toBe('reply');
        expect(new MessageType('newEvent').getValue()).toBe('newEvent');
    });

    it('should throw error for invalid type', () => {
        expect(() => new MessageType('invalid' as any)).toThrow('Invalid message type');
    });

    it('should create via factory methods', () => {
        expect(MessageType.system().getValue()).toBe('system');
        expect(MessageType.ai().getValue()).toBe('ai');
        expect(MessageType.reply().getValue()).toBe('reply');
        expect(MessageType.newEvent().getValue()).toBe('newEvent');
    });

    it('should create from string', () => {
        expect(MessageType.fromString('system').getValue()).toBe('system');
        expect(MessageType.fromString('ai').getValue()).toBe('ai');
        expect(MessageType.fromString('reply').getValue()).toBe('reply');
        expect(MessageType.fromString('newEvent').getValue()).toBe('newEvent');
        expect(() => MessageType.fromString('invalid')).toThrow('Invalid message type');
    });

    it('should check type correctly', () => {
        const system = MessageType.system();
        expect(system.isSystem()).toBe(true);
        expect(system.isReply()).toBe(false);

        const reply = MessageType.reply();
        expect(reply.isReply()).toBe(true);
        expect(reply.isSystem()).toBe(false);

        const newEvent = MessageType.newEvent();
        expect(newEvent.isNewEvent()).toBe(true);
    });
});
