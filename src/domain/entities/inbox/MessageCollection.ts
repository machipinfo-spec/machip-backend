import { MessageId } from '../../value-object/inbox/MessageId';
import { MessageType, MessageTypeValue } from '../../value-object/inbox/MessageType';
import { ReadStatus } from '../../value-object/inbox/ReadStatus';
import { Message, MessageDTO } from './Message';
import { ValidationError } from '../DomainError';
import { DTOMapper } from '../DTOMapper';

export interface MessageCollectionDTO {
    messages: MessageDTO[];
    count: number;
    unreadCount: number;
    systemMessageCount: number;
    aiMessageCount: number;
}

export class MessageCollection implements DTOMapper<MessageCollection, MessageCollectionDTO> {
    private static readonly MAX_MESSAGES = 10000;

    constructor(private readonly messages: Message[]) {
        this.validateState();
    }

    // 整合性検証
    private validateState(): void {
        this.validateRequiredFields();
        this.validateBusinessRules();
    }

    private validateRequiredFields(): void {
        if (!this.messages) {
            throw new ValidationError('Messages array is required', 'messages');
        }
    }

    private validateBusinessRules(): void {
        if (this.messages.length > MessageCollection.MAX_MESSAGES) {
            throw new ValidationError(
                `Message collection cannot exceed ${MessageCollection.MAX_MESSAGES} items`,
                'messages',
            );
        }

        // 重複チェック
        const messageIds = new Set<string>();
        for (const message of this.messages) {
            const id = message.getId().getValue();
            if (messageIds.has(id)) {
                throw new ValidationError(`Duplicate message ID found: ${id}`, 'messages');
            }
            messageIds.add(id);
        }
    }

    // ファクトリメソッド
    public static create(messages: Message[] = []): MessageCollection {
        return new MessageCollection([...messages]);
    }

    public static fromDTO(dto: MessageCollectionDTO): MessageCollection {
        // 入力データの検証
        if (!dto.messages) {
            throw new ValidationError('DTO messages is required', 'messages');
        }

        try {
            const messages = dto.messages.map((messageDTO) => Message.fromDTO(messageDTO));
            return new MessageCollection(messages);
        } catch (error) {
            throw new ValidationError(`Failed to create MessageCollection from DTO: ${error}`, 'dto');
        }
    }

    // DTOへの変換
    public toDTO(): MessageCollectionDTO {
        return {
            messages: this.messages.map((message) => message.toDTO()),
            count: this.count(),
            unreadCount: this.getUnreadCount(),
            systemMessageCount: this.getSystemMessages().count(),
            aiMessageCount: this.getAIMessages().count(),
        };
    }

    // 基本操作
    public getAll(): Message[] {
        return [...this.messages];
    }

    public count(): number {
        return this.messages.length;
    }

    public isEmpty(): boolean {
        return this.messages.length === 0;
    }

    // フィルタリング操作
    public filterByType(type: MessageType): MessageCollection {
        if (!type) {
            throw new ValidationError('Message type is required', 'type');
        }

        const filtered = this.messages.filter((message) => message.isSameType(type));
        return new MessageCollection(filtered);
    }

    public filterByReadStatus(isRead: boolean): MessageCollection {
        const filtered = this.messages.filter((message) => (isRead ? message.isRead() : message.isUnread()));
        return new MessageCollection(filtered);
    }

    public getUnreadMessages(): MessageCollection {
        return this.filterByReadStatus(false);
    }

    public getReadMessages(): MessageCollection {
        return this.filterByReadStatus(true);
    }

    public getSystemMessages(): MessageCollection {
        return this.filterByType(MessageType.system());
    }

    public getAIMessages(): MessageCollection {
        return this.filterByType(MessageType.ai());
    }

    // カウント操作
    public getUnreadCount(): number {
        return this.getUnreadMessages().count();
    }

    public getUnreadCountByType(type: MessageTypeValue | 'all'): number {
        if (type === 'all') {
            return this.getUnreadCount();
        }

        const messageType = type === 'system' ? MessageType.system() : MessageType.ai();
        return this.filterByType(messageType).getUnreadCount();
    }

    // ソート操作
    public sortByCreatedAtDesc(): MessageCollection {
        const sorted = [...this.messages].sort((a, b) => {
            if (a.getCreatedAt().isAfter(b.getCreatedAt())) return -1;
            if (a.getCreatedAt().isBefore(b.getCreatedAt())) return 1;
            return 0;
        });
        return new MessageCollection(sorted);
    }

    // 検索操作
    public findById(id: MessageId): Message | null {
        if (!id) {
            return null;
        }

        return this.messages.find((message) => message.getId().equals(id)) || null;
    }

    // 変更操作（新しいインスタンスを返す）
    public add(message: Message): MessageCollection {
        if (!message) {
            throw new ValidationError('Message is required', 'message');
        }

        // 既に存在するかチェック
        const exists = this.messages.some((m) => m.getId().equals(message.getId()));
        if (exists) {
            throw new ValidationError('Message with this ID already exists', 'message');
        }

        return new MessageCollection([...this.messages, message]);
    }

    public remove(messageId: MessageId): MessageCollection {
        if (!messageId) {
            throw new ValidationError('Message ID is required', 'messageId');
        }

        const filtered = this.messages.filter((message) => !message.getId().equals(messageId));
        return new MessageCollection(filtered);
    }

    public update(updatedMessage: Message): MessageCollection {
        if (!updatedMessage) {
            throw new ValidationError('Updated message is required', 'updatedMessage');
        }

        const updated = this.messages.map((message) =>
            message.getId().equals(updatedMessage.getId()) ? updatedMessage : message,
        );
        return new MessageCollection(updated);
    }

    public markAllAsRead(): MessageCollection {
        const updated = this.messages.map((message) => {
            if (message.isUnread()) {
                const newMessage = Message.reconstruct(
                    message.getId(),
                    message.getType(),
                    message.getSubject(),
                    message.getContent(),
                    message.getSenderUserId(),
                    message.getCreatedAt(),
                    ReadStatus.read(),
                );
                return newMessage;
            }
            return message;
        });
        return new MessageCollection(updated);
    }

    // ドメインロジック
    public hasUnreadMessages(): boolean {
        return this.getUnreadCount() > 0;
    }

    public hasSystemMessages(): boolean {
        return this.getSystemMessages().count() > 0;
    }

    public hasAIMessages(): boolean {
        return this.getAIMessages().count() > 0;
    }

    public isFull(): boolean {
        return this.messages.length >= MessageCollection.MAX_MESSAGES;
    }

    public getMessagesByType(type: MessageTypeValue): MessageCollection {
        const messageType = type === 'system' ? MessageType.system() : MessageType.ai();
        return this.filterByType(messageType);
    }

    // 同一性の比較
    public equals(other?: MessageCollection): boolean {
        if (!other) {
            return false;
        }

        if (this.count() !== other.count()) {
            return false;
        }

        // 全てのMessageが同じかチェック
        const thisIds = new Set(this.messages.map((m) => m.getId().getValue()));
        const otherIds = new Set(other.messages.map((m) => m.getId().getValue()));

        if (thisIds.size !== otherIds.size) {
            return false;
        }

        for (const id of thisIds) {
            if (!otherIds.has(id)) {
                return false;
            }
        }

        return true;
    }
}
