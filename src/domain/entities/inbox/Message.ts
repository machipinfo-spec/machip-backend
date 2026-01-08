import { CreatedAt } from '../../value-object/inbox/CreatedAt';
import { SystemMessageContent } from '../../value-object/inbox/SystemMessageContent';
import { ReplyMessageContent } from '../../value-object/inbox/ReplyMessageContent';
import { MessageId } from '../../value-object/inbox/MessageId';
import { MessageSubject } from '../../value-object/inbox/MessageSubject';
import { MessageType } from '../../value-object/inbox/MessageType';
import { ReadStatus } from '../../value-object/inbox/ReadStatus';
import { ValidationError } from '../DomainError';
import { DTOMapper } from '../DTOMapper';
import { UserId } from '../../value-object/users/UserId';
import { NewEventMessageContent } from '../../value-object/inbox/NewEventMessageContent';

export type MessageContent = SystemMessageContent | ReplyMessageContent | NewEventMessageContent;

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
        // Validate content type matches message type
        if (this.type.getValue() === 'system' && !(this.content instanceof SystemMessageContent)) {
            throw new ValidationError('System message must have SystemMessageContent', 'content');
        }
        if (this.type.getValue() === 'reply' && !(this.content instanceof ReplyMessageContent)) {
            throw new ValidationError('Reply message must have ReplyMessageContent', 'content');
        }
        if (this.type.getValue() === 'newEvent' && !(this.content instanceof NewEventMessageContent)) {
            throw new ValidationError('New event message must have NewEventMessageContent', 'content');
        }
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
            const messageType = MessageType.fromString(dto.type);

            // Parse content based on type
            let content: MessageContent;
            if (dto.type === 'system' || dto.type === 'ai') {
                // Try to parse as JSON first, fallback to legacy string format
                try {
                    content = SystemMessageContent.fromJSON(dto.content);
                } catch {
                    // Legacy format: plain string
                    content = SystemMessageContent.create(dto.content);
                }
            } else if (dto.type === 'reply') {
                content = ReplyMessageContent.fromJSON(dto.content);
            } else if (dto.type === 'newEvent') {
                content = NewEventMessageContent.fromJSON(dto.content);
            } else {
                throw new ValidationError(`Unknown message type: ${dto.type}`, 'type');
            }

            return new Message(
                MessageId.fromExisting(dto.messageId),
                messageType,
                MessageSubject.create(dto.subject),
                content,
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
            SystemMessageContent.create(content),
            UserId.fromExisting(senderUserId),
        );
    }

    // DTOへの変換
    public toDTO(): MessageDTO {
        return {
            messageId: this.messageId.getValue(),
            type: this.type.getValue(),
            subject: this.subject.getValue(),
            content: this.content.toJSON(),
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

    public isEmpty(): boolean {
        if (this.content instanceof SystemMessageContent) {
            return this.subject.getValue().trim() === '' && this.content.getMessage().trim() === '';
        } else if (this.content instanceof ReplyMessageContent) {
            return this.subject.getValue().trim() === '' && this.content.getContent().trim() === '';
        } else if (this.content instanceof NewEventMessageContent) {
            return false;
        }
        return false;
    }

    public equals(other?: Message): boolean {
        if (!other) {
            return false;
        }
        return this.messageId.equals(other.messageId);
    }

    // Type guards
    public isSystemMessage(): this is Message & { content: SystemMessageContent } {
        return this.content instanceof SystemMessageContent;
    }

    public isReplyMessage(): this is Message & { content: ReplyMessageContent } {
        return this.content instanceof ReplyMessageContent;
    }

    public isNewEventMessage(): this is Message & { content: NewEventMessageContent } {
        return this.content instanceof NewEventMessageContent;
    }
}
