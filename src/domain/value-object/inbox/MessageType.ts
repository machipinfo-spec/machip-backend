import { ValueObject } from '../ValueObject';

export type MessageTypeValue = 'system' | 'ai' | 'reply';

export class MessageType extends ValueObject<MessageTypeValue> {
    protected validate(): void {
        const validTypes: ReadonlyArray<MessageTypeValue> = ['system', 'ai', 'reply'];
        if (!validTypes.includes(this.value)) {
            throw new Error(`Invalid message type: ${this.value}. Must be one of: ${validTypes.join(', ')}`);
        }
    }

    constructor(type: MessageTypeValue) {
        super(type);
        Object.freeze(this);
    }

    public static system(): MessageType {
        return new MessageType('system');
    }

    public static ai(): MessageType {
        return new MessageType('ai');
    }
    public static reply(): MessageType {
        return new MessageType('reply');
    }

    public static fromString(type: string): MessageType {
        if (type === 'system') {
            return MessageType.system();
        } else if (type === 'ai') {
            return MessageType.ai();
        } else if (type === 'reply') {
            return MessageType.reply();
        } else {
            throw new Error(`Invalid message type: ${type}. Must be one of: system, ai, reply`);
        }
    }
}
