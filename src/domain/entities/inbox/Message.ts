import { CreatedAt } from '../../value-object/inbox/CreatedAt';
import { MessageContent } from '../../value-object/inbox/MessageContent';
import { MessageId } from '../../value-object/inbox/MessageId';
import { MessageSubject } from '../../value-object/inbox/MessageSubject';
import { MessageType } from '../../value-object/inbox/MessageType';
import { ReadStatus } from '../../value-object/inbox/ReadStatus';
import { ValidationError } from '../DomainError';
import { DTOMapper } from '../DTOMapper';
import { UserId } from '../../value-object/users/UserId';

export interface MessageDTO {
    messageId: string;
    type: string;
    subject: string;
    content: string;
    senderUserId: string;
    createdAt: string;
    isRead: boolean;
}

export class Message implements DTOMapper<Message, MessageDTO> {
    private static readonly MAX_CONTENT_LENGTH = 10000;
    private static readonly CONTENT_PREVIEW_LENGTH = 100;
    private static readonly RECENT_MESSAGE_THRESHOLD_HOURS = 24;

    private readonly messageId: MessageId;
    private readonly type: MessageType;
    private readonly subject: MessageSubject;
    private readonly content: MessageContent;
    private readonly senderUserId: UserId;
    private readonly createdAt: CreatedAt;
    private readStatus: ReadStatus;

    constructor(
        messageId: MessageId,
        type: MessageType,
        subject: MessageSubject,
        content: MessageContent,
        senderUserId: UserId,
        createdAt: CreatedAt,
        readStatus: ReadStatus,
    ) {
        this.messageId = messageId;
        this.type = type;
        this.subject = subject;
        this.content = content;
        this.senderUserId = senderUserId;
        this.createdAt = createdAt;
        this.readStatus = readStatus;

        this.validateState();
    }

    // 整合性検証
    private validateState(): void {
        this.validateRequiredFields();
        this.validateBusinessRules();
    }

    private validateRequiredFields(): void {
        if (!this.messageId) {
            throw new ValidationError('Message ID is required', 'messageId');
        }
        if (!this.type) {
            throw new ValidationError('Message type is required', 'type');
        }
        if (!this.subject) {
            throw new ValidationError('Message subject is required', 'subject');
        }
        if (!this.content) {
            throw new ValidationError('Message content is required', 'content');
        }
        if (!this.senderUserId) {
            throw new ValidationError('senderUserId is required', 'senderUserId');
        }
        if (!this.createdAt) {
            throw new ValidationError('Created at is required', 'createdAt');
        }
        if (!this.readStatus) {
            throw new ValidationError('Read status is required', 'readStatus');
        }
    }

    private validateBusinessRules(): void {
        // if (this.content.getValue().length > Message.MAX_CONTENT_LENGTH) {
        //     throw new ValidationError(
        //         `Message content cannot exceed ${Message.MAX_CONTENT_LENGTH} characters`,
        //         'content',
        //     );
        // }
    }

    // ファクトリメソッド
    public static create(
        type: MessageType,
        subject: MessageSubject,
        content: MessageContent,
        senderUserId: UserId,
    ): Message {
        return new Message(
            MessageId.create(),
            type,
            subject,
            content,
            senderUserId,
            CreatedAt.now(),
            ReadStatus.unread(),
        );
    }

    public static reconstruct(
        id: MessageId,
        type: MessageType,
        subject: MessageSubject,
        content: MessageContent,
        senderUserId: UserId,
        createdAt: CreatedAt,
        readStatus: ReadStatus,
    ): Message {
        return new Message(id, type, subject, content, senderUserId, createdAt, readStatus);
    }

    public static fromDTO(dto: MessageDTO): Message {
        // 入力データの検証
        if (!dto.messageId) {
            throw new ValidationError('DTO messageId is required', 'messageId');
        }
        if (!dto.type) {
            throw new ValidationError('DTO type is required', 'type');
        }

        try {
            const senderUserId = UserId.fromExisting(dto.senderUserId);

            return new Message(
                MessageId.fromExisting(dto.messageId),
                MessageType.fromString(dto.type),
                MessageSubject.create(dto.subject),
                MessageContent.create(dto.content),
                senderUserId,
                CreatedAt.fromISOString(dto.createdAt),
                ReadStatus.fromBoolean(dto.isRead),
            );
        } catch (error) {
            throw new ValidationError(`Failed to create Message from DTO: ${error}`, 'dto');
        }
    }

    // システムメッセージ作成のファクトリメソッド
    public static createSystemMessage(subject: string, content: string, senderUserId = 'システム管理者'): Message {
        return Message.create(
            MessageType.system(),
            MessageSubject.create(subject),
            MessageContent.create(content),
            UserId.fromExisting(senderUserId),
        );
    }

    // DTOへの変換
    public toDTO(): MessageDTO {
        return {
            messageId: this.messageId.getValue(),
            type: this.type.getValue(),
            subject: this.subject.getValue(),
            content: this.content.getValue(),
            senderUserId: this.senderUserId.getValue(),
            createdAt: this.createdAt.toISOString(),
            isRead: this.readStatus.getValue(),
        };
    }

    // Getters
    public getId(): MessageId {
        return this.messageId;
    }

    public getType(): MessageType {
        return this.type;
    }

    public getSubject(): MessageSubject {
        return this.subject;
    }

    public getContent(): MessageContent {
        return this.content;
    }

    public getSenderUserId(): UserId {
        return this.senderUserId;
    }

    public getCreatedAt(): CreatedAt {
        return this.createdAt;
    }

    public getReadStatus(): ReadStatus {
        return this.readStatus;
    }

    // Business Logic
    public markAsRead(): void {
        this.readStatus = this.readStatus.markAsRead();
    }

    public isRead(): boolean {
        return this.readStatus.isRead();
    }

    public isUnread(): boolean {
        return this.readStatus.isUnread();
    }

    public isSystemMessage(): boolean {
        return this.type.isSystem();
    }

    public isAIMessage(): boolean {
        return this.type.isAi();
    }

    public getContentPreview(maxLength = Message.CONTENT_PREVIEW_LENGTH): string {
        return this.content.getPreview(maxLength);
    }

    public isSameType(type: MessageType): boolean {
        return this.type.equals(type);
    }

    public isCreatedBefore(date: CreatedAt): boolean {
        return this.createdAt.isBefore(date);
    }

    public isCreatedAfter(date: CreatedAt): boolean {
        return this.createdAt.isAfter(date);
    }

    public isRecentlyCreated(hoursThreshold = Message.RECENT_MESSAGE_THRESHOLD_HOURS): boolean {
        const now = CreatedAt.now();
        const diffInHours = (now.getValue().getTime() - this.createdAt.getValue().getTime()) / (1000 * 60 * 60);
        return diffInHours <= hoursThreshold;
    }

    public hasLongContent(): boolean {
        return this.content.getValue().length > Message.CONTENT_PREVIEW_LENGTH * 2;
    }

    public isEmpty(): boolean {
        return this.subject.getValue().trim() === '' && this.content.getValue().trim() === '';
    }

    public equals(other?: Message): boolean {
        if (!other) {
            return false;
        }
        return this.messageId.equals(other.messageId);
    }
}
