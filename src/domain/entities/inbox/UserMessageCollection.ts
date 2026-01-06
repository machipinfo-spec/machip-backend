import { MessageId } from '../../value-object/inbox/MessageId';
import { ReadAt } from '../../value-object/inbox/ReadAt';
import { UserMessage } from '../../value-object/inbox/UserMessage';
import { UserMessageId } from '../../value-object/inbox/UserMessageId';
import { UserId } from '../../value-object/users/UserId';
import { DeliveredAt } from '../../value-object/inbox/DeliveredAt';
import { ValidationError } from '../DomainError';
import { DTOMapper } from '../DTOMapper';

export interface UserMessageCollectionDTO {
    userMessages: {
        readonly id: string;
        readonly userId: string;
        readonly messageId: string;
        readonly deliveredAt: string;
        readonly readAt: string | null;
        readonly isRead: boolean;
    }[];
    count: number;
    unreadCount: number;
}

export class UserMessageCollection implements DTOMapper<UserMessageCollection, UserMessageCollectionDTO> {
    private static readonly MAX_USER_MESSAGES = 10000;

    constructor(private readonly userMessages: UserMessage[]) {
        this.validateState();
    }

    // 整合性検証
    private validateState(): void {
        this.validateRequiredFields();
        this.validateBusinessRules();
    }

    private validateRequiredFields(): void {
        if (!this.userMessages) {
            throw new ValidationError('User messages array is required', 'userMessages');
        }
    }

    private validateBusinessRules(): void {
        if (this.userMessages.length > UserMessageCollection.MAX_USER_MESSAGES) {
            throw new ValidationError(
                `User message collection cannot exceed ${UserMessageCollection.MAX_USER_MESSAGES} items`,
                'userMessages',
            );
        }

        // 重複チェック
        const userMessageIds = new Set<string>();
        for (const userMessage of this.userMessages) {
            const id = userMessage.getId().getValue();
            if (userMessageIds.has(id)) {
                throw new ValidationError(`Duplicate user message ID found: ${id}`, 'userMessages');
            }
            userMessageIds.add(id);
        }
    }

    // ファクトリメソッド
    public static create(userMessages: UserMessage[] = []): UserMessageCollection {
        return new UserMessageCollection([...userMessages]);
    }

    public static fromDTO(dto: UserMessageCollectionDTO): UserMessageCollection {
        // 入力データの検証
        if (!dto.userMessages) {
            throw new ValidationError('DTO userMessages is required', 'userMessages');
        }

        try {
            // UserMessageはDTOパターンを実装していないため、
            // reconstructメソッドを使用してインスタンスを作成
            const userMessages = dto.userMessages.map((userMessageData) => {
                return UserMessage.reconstruct(
                    UserMessageId.fromExisting(userMessageData.id),
                    UserId.fromExisting(userMessageData.userId),
                    MessageId.fromExisting(userMessageData.messageId),
                    DeliveredAt.fromISOString(userMessageData.deliveredAt),
                    userMessageData.readAt ? ReadAt.fromISOString(userMessageData.readAt) : ReadAt.unread(),
                );
            });
            return new UserMessageCollection(userMessages);
        } catch (error) {
            throw new ValidationError(`Failed to create UserMessageCollection from DTO: ${error}`, 'dto');
        }
    }

    // DTOへの変換
    public toDTO(): UserMessageCollectionDTO {
        return {
            userMessages: this.userMessages.map((um) => um.toDTO()),
            count: this.count(),
            unreadCount: this.getUnreadCount(),
        };
    }

    // 基本操作
    public getAll(): UserMessage[] {
        return [...this.userMessages];
    }

    public count(): number {
        return this.userMessages.length;
    }

    public isEmpty(): boolean {
        return this.userMessages.length === 0;
    }

    // フィルタリング操作
    public filterByUser(userId: UserId): UserMessageCollection {
        if (!userId) {
            throw new ValidationError('User ID is required', 'userId');
        }

        const filtered = this.userMessages.filter((um) => um.isSameUser(userId));
        return new UserMessageCollection(filtered);
    }

    public filterByMessage(messageId: MessageId): UserMessageCollection {
        if (!messageId) {
            throw new ValidationError('Message ID is required', 'messageId');
        }

        const filtered = this.userMessages.filter((um) => um.isSameMessage(messageId));
        return new UserMessageCollection(filtered);
    }

    public filterByReadStatus(isRead: boolean): UserMessageCollection {
        const filtered = this.userMessages.filter((um) => (isRead ? um.isRead() : um.isUnread()));
        return new UserMessageCollection(filtered);
    }

    public getUnreadMessages(): UserMessageCollection {
        return this.filterByReadStatus(false);
    }

    public getReadMessages(): UserMessageCollection {
        return this.filterByReadStatus(true);
    }

    // カウント操作
    public getUnreadCount(): number {
        return this.getUnreadMessages().count();
    }

    public getUnreadCountForUser(userId: UserId): number {
        if (!userId) {
            throw new ValidationError('User ID is required', 'userId');
        }

        return this.filterByUser(userId).getUnreadCount();
    }

    // ソート操作
    public sortByDeliveredAtDesc(): UserMessageCollection {
        const sorted = [...this.userMessages].sort((a, b) => {
            if (a.getDeliveredAt().isAfter(b.getDeliveredAt())) return -1;
            if (a.getDeliveredAt().isBefore(b.getDeliveredAt())) return 1;
            return 0;
        });
        return new UserMessageCollection(sorted);
    }

    // 検索操作
    public findById(id: UserMessageId): UserMessage | null {
        if (!id) {
            return null;
        }

        return this.userMessages.find((um) => um.getId().equals(id)) || null;
    }

    public findByUserAndMessage(userId: UserId, messageId: MessageId): UserMessage | null {
        if (!userId || !messageId) {
            return null;
        }

        return this.userMessages.find((um) => um.isSameUser(userId) && um.isSameMessage(messageId)) || null;
    }

    // 変更操作（新しいインスタンスを返す）
    public add(userMessage: UserMessage): UserMessageCollection {
        if (!userMessage) {
            throw new ValidationError('User message is required', 'userMessage');
        }

        // 既に存在するかチェック
        const exists = this.userMessages.some((um) => um.getId().equals(userMessage.getId()));
        if (exists) {
            throw new ValidationError('User message with this ID already exists', 'userMessage');
        }

        return new UserMessageCollection([...this.userMessages, userMessage]);
    }

    public remove(userMessageId: UserMessageId): UserMessageCollection {
        if (!userMessageId) {
            throw new ValidationError('User message ID is required', 'userMessageId');
        }

        const filtered = this.userMessages.filter((um) => !um.getId().equals(userMessageId));
        return new UserMessageCollection(filtered);
    }

    public update(updatedUserMessage: UserMessage): UserMessageCollection {
        if (!updatedUserMessage) {
            throw new ValidationError('Updated user message is required', 'updatedUserMessage');
        }

        const updated = this.userMessages.map((um) =>
            um.getId().equals(updatedUserMessage.getId()) ? updatedUserMessage : um,
        );
        return new UserMessageCollection(updated);
    }

    public markAllAsReadForUser(userId: UserId): UserMessageCollection {
        if (!userId) {
            throw new ValidationError('User ID is required', 'userId');
        }

        const updated = this.userMessages.map((um) => {
            if (um.isSameUser(userId) && um.isUnread()) {
                const newUserMessage = UserMessage.reconstruct(
                    um.getId(),
                    um.getUserId(),
                    um.getMessageId(),
                    um.getDeliveredAt(),
                    ReadAt.now(),
                );
                return newUserMessage;
            }
            return um;
        });
        return new UserMessageCollection(updated);
    }

    // ユーティリティ操作
    public getUserIds(): UserId[] {
        const userIdSet = new Set<string>();
        const userIds: UserId[] = [];

        this.userMessages.forEach((um) => {
            const userIdValue = um.getUserId().getValue();
            if (!userIdSet.has(userIdValue)) {
                userIdSet.add(userIdValue);
                userIds.push(um.getUserId());
            }
        });

        return userIds;
    }

    public getMessageIds(): MessageId[] {
        const messageIdSet = new Set<string>();
        const messageIds: MessageId[] = [];

        this.userMessages.forEach((um) => {
            const messageIdValue = um.getMessageId().getValue();
            if (!messageIdSet.has(messageIdValue)) {
                messageIdSet.add(messageIdValue);
                messageIds.push(um.getMessageId());
            }
        });

        return messageIds;
    }

    // ドメインロジック
    public hasUnreadMessages(): boolean {
        return this.getUnreadCount() > 0;
    }

    public hasMessagesForUser(userId: UserId): boolean {
        if (!userId) {
            return false;
        }

        return this.userMessages.some((um) => um.isSameUser(userId));
    }

    public isFull(): boolean {
        return this.userMessages.length >= UserMessageCollection.MAX_USER_MESSAGES;
    }

    public getUserCount(): number {
        return this.getUserIds().length;
    }

    public getMessageCount(): number {
        return this.getMessageIds().length;
    }

    // 同一性の比較
    public equals(other?: UserMessageCollection): boolean {
        if (!other) {
            return false;
        }

        if (this.count() !== other.count()) {
            return false;
        }

        // 全てのUserMessageが同じかチェック
        const thisIds = new Set(this.userMessages.map((um) => um.getId().getValue()));
        const otherIds = new Set(other.userMessages.map((um) => um.getId().getValue()));

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
