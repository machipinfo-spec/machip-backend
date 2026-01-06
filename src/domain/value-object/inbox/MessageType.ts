import { ValueObject } from '../ValueObject';

export type MessageTypeValue = 'system' | 'ai';

export class MessageType extends ValueObject<MessageTypeValue> {
    protected validate(): void {
        const validTypes: ReadonlyArray<MessageTypeValue> = ['system', 'ai'];
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

    public isSystem(): boolean {
        return this.value === 'system';
    }

    public isAi(): boolean {
        return this.value === 'ai';
    }

    // イミュータブルな更新メソッド（通常は型変更しないが、必要に応じて）
    public toSystem(): MessageType {
        return MessageType.system();
    }

    public toAi(): MessageType {
        return MessageType.ai();
    }

    // 便利メソッド
    public getDisplayName(): string {
        switch (this.value) {
            case 'system':
                return 'System Message';
            case 'ai':
                return 'AI Message';
            default:
                return 'Unknown Message Type';
        }
    }

    public isAutomated(): boolean {
        return this.isSystem() || this.isAi();
    }

    public static fromString(type: string): MessageType {
        if (type === 'system') {
            return MessageType.system();
        } else if (type === 'ai') {
            return MessageType.ai();
        } else {
            throw new Error(`Invalid message type: ${type}. Must be one of: system, ai`);
        }
    }
}
