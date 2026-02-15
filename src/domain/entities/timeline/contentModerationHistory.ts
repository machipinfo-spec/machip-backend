import { ContentModerationHistoryId } from '../../value-object/timeline/contentModerationHistoryId';

export class ContentModerationHistory {
    private constructor(
        private readonly id: ContentModerationHistoryId,
        private readonly targetId: string,
        private readonly content: string,
        private readonly isViolation: boolean,
        private readonly reason: string,
        private readonly aiResponse: string,
        private readonly createdAt: Date,
    ) {
        Object.freeze(this);
    }

    public static create(
        targetId: string,
        content: string,
        isViolation: boolean,
        reason: string,
        aiResponse: string,
    ): ContentModerationHistory {
        return new ContentModerationHistory(
            ContentModerationHistoryId.create(),
            targetId,
            content,
            isViolation,
            reason,
            aiResponse,
            new Date(),
        );
    }

    public static fromExisting(
        id: ContentModerationHistoryId,
        targetId: string,
        content: string,
        isViolation: boolean,
        reason: string,
        aiResponse: string,
        createdAt: Date,
    ): ContentModerationHistory {
        return new ContentModerationHistory(id, targetId, content, isViolation, reason, aiResponse, createdAt);
    }

    public getId(): ContentModerationHistoryId {
        return this.id;
    }

    public getTargetId(): string {
        return this.targetId;
    }

    public getContent(): string {
        return this.content;
    }

    public getIsViolation(): boolean {
        return this.isViolation;
    }

    public getReason(): string {
        return this.reason;
    }

    public getAiResponse(): string {
        return this.aiResponse;
    }

    public getCreatedAt(): Date {
        return this.createdAt;
    }

    public toPrimitives(): ContentModerationHistoryDTO {
        return {
            id: this.id.getValue(),
            targetId: this.targetId,
            content: this.content,
            isViolation: this.isViolation,
            reason: this.reason,
            aiResponse: this.aiResponse,
            createdAt: this.createdAt,
        };
    }
}

export interface ContentModerationHistoryDTO {
    id: string;
    targetId: string;
    content: string;
    isViolation: boolean;
    reason: string;
    aiResponse: string;
    createdAt: Date;
}
