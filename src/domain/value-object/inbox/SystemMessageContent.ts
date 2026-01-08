import { ValueObject } from '../ValueObject';

export interface SystemMessageData {
    message: string;
}

export class SystemMessageContent extends ValueObject<SystemMessageData> {
    protected validate(): void {
        if (!this.value.message || this.value.message.trim().length === 0) {
            throw new Error('System message content cannot be empty');
        }
    }

    constructor(data: SystemMessageData) {
        super(data);
        Object.freeze(this);
    }

    public static create(message: string): SystemMessageContent {
        return new SystemMessageContent({ message });
    }

    public static fromJSON(json: string): SystemMessageContent {
        try {
            const data = JSON.parse(json) as SystemMessageData;
            return new SystemMessageContent(data);
        } catch (error) {
            throw new Error(`Failed to parse SystemMessageContent from JSON: ${error}`);
        }
    }

    public static fromObject(data: SystemMessageData): SystemMessageContent {
        return new SystemMessageContent(data);
    }

    public toJSON(): string {
        return JSON.stringify(this.value);
    }

    public getMessage(): string {
        return this.value.message;
    }

    public getPreview(maxLength = 100): string {
        const cleanContent = this.value.message.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanContent.length <= maxLength) {
            return cleanContent;
        }
        return cleanContent.substring(0, maxLength).trim() + '...';
    }

    public getCharacterCount(): number {
        return this.value.message.length;
    }

    public hasText(searchText: string): boolean {
        return this.value.message.includes(searchText);
    }
}
