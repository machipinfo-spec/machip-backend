import { ValueObject } from '../ValueObject';

export interface ReplyMessageData {
    ownerThreadId: string;
    threadId: string;
    content: string;
    replyUserId: string;
    replyUserName: string;
}

export class ReplyMessageContent extends ValueObject<ReplyMessageData> {
    protected validate(): void {
        if (!this.value.ownerThreadId || this.value.ownerThreadId.trim().length === 0) {
            throw new Error('Owner thread ID cannot be empty');
        }
        if (!this.value.threadId || this.value.threadId.trim().length === 0) {
            throw new Error('Thread ID cannot be empty');
        }
        if (!this.value.content || this.value.content.trim().length === 0) {
            throw new Error('Reply message content cannot be empty');
        }
        if (!this.value.replyUserId || this.value.replyUserId.trim().length === 0) {
            throw new Error('Reply user ID cannot be empty');
        }
        if (!this.value.replyUserName || this.value.replyUserName.trim().length === 0) {
            throw new Error('Reply user name cannot be empty');
        }
    }

    constructor(data: ReplyMessageData) {
        super(data);
        Object.freeze(this);
    }

    public static create(
        ownerThreadId: string,
        threadId: string,
        content: string,
        replyUserId: string,
        replyUserName: string,
    ): ReplyMessageContent {
        return new ReplyMessageContent({
            ownerThreadId,
            threadId,
            content,
            replyUserId,
            replyUserName,
        });
    }

    public static fromJSON(json: string): ReplyMessageContent {
        try {
            const data = JSON.parse(json) as ReplyMessageData;
            return new ReplyMessageContent(data);
        } catch (error) {
            throw new Error(`Failed to parse ReplyMessageContent from JSON: ${error}`);
        }
    }

    public static fromObject(data: ReplyMessageData): ReplyMessageContent {
        return new ReplyMessageContent(data);
    }

    public toJSON(): string {
        return JSON.stringify(this.value);
    }

    public getOwnerThreadId(): string {
        return this.value.ownerThreadId;
    }

    public getThreadId(): string {
        return this.value.threadId;
    }

    public getContent(): string {
        return this.value.content;
    }

    public getReplyUserId(): string {
        return this.value.replyUserId;
    }

    public getReplyUserName(): string {
        return this.value.replyUserName;
    }

    public getPreview(maxLength = 100): string {
        const cleanContent = this.value.content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanContent.length <= maxLength) {
            return cleanContent;
        }
        return cleanContent.substring(0, maxLength).trim() + '...';
    }

    public getCharacterCount(): number {
        return this.value.content.length;
    }

    public hasText(searchText: string): boolean {
        return this.value.content.includes(searchText);
    }
}
