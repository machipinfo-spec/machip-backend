import { UserMessageCollection } from '../../../../domain/entities/inbox/UserMessageCollection';
import { IUserMessageRepository } from '../../../../domain/repositories/inbox/IUserMessageRepository';
import { DeliveredAt } from '../../../../domain/value-object/inbox/DeliveredAt';
import { MessageId } from '../../../../domain/value-object/inbox/MessageId';
import { MessageTypeValue, MessageType } from '../../../../domain/value-object/inbox/MessageType';
import { ReadAt } from '../../../../domain/value-object/inbox/ReadAt';
import { UserMessage } from '../../../../domain/value-object/inbox/UserMessage';
import { UserMessageId } from '../../../../domain/value-object/inbox/UserMessageId';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { Logger } from '../../../../shared/logger';
import { getDbAndAuth } from '../../config/firebaseAdmin';

interface UserMessageDocument {
    userMessageId: string;
    userId: string;
    messageId: string;
    deliveredAt: string;
    readAt: string | null;
    isRead: boolean;
    // メッセージ情報を非正規化（検索パフォーマンス向上のため）
    messageType: MessageTypeValue;
    messageSubject: string;
    senderUserId: string;
}

export class UserMessageRepository implements IUserMessageRepository {
    private readonly tableName = 'UserMessages';
    private readonly logger: Logger;

    constructor(loggerInstance?: Logger) {
        this.logger = loggerInstance || new Logger('UserMessageRepository');
    }

    async save(userMessage: UserMessage): Promise<void> {
        // メッセージ情報を取得（非正規化のため）
        const { db } = await getDbAndAuth();
        const messageDoc = await db.collection('Messages').doc(userMessage.getMessageId().getValue()).get();

        if (!messageDoc.exists) {
            throw new Error(`Message not found: ${userMessage.getMessageId().getValue()}`);
        }

        const messageData = messageDoc.data();

        const record: UserMessageDocument = {
            userMessageId: userMessage.getId().getValue(),
            userId: userMessage.getUserId().getValue(),
            messageId: userMessage.getMessageId().getValue(),
            deliveredAt: userMessage.getDeliveredAt().toISOString(),
            readAt: userMessage.getReadAt().toISOString() || null,
            isRead: userMessage.getReadAt().isRead(),
            // 非正規化データ
            messageType: messageData?.type || 'ai',
            messageSubject: messageData?.subject || '',
            senderUserId: messageData?.senderUserId || '',
        };

        await db.collection(this.tableName).doc(userMessage.getId().getValue()).set(record);

        this.logger.debug(`ユーザーメッセージ保存完了: ${JSON.stringify(record)}`);
    }

    async findById(id: UserMessageId): Promise<UserMessage | null> {
        const userMessageId = id.getValue();
        this.logger.debug(`DBからユーザーメッセージを取得: ${userMessageId}`);

        const { db } = await getDbAndAuth();
        const docRef = await db.collection(this.tableName).doc(userMessageId).get();

        if (!docRef.exists) {
            return null;
        }

        const data = docRef.data() as UserMessageDocument;
        return this.documentToUserMessage(data);
    }

    async findByUserId(userId: UserId): Promise<UserMessageCollection> {
        const userIdValue = userId.getValue();
        this.logger.debug(`DBからユーザーID別メッセージを取得: ${userIdValue}`);

        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('userId', '==', userIdValue)
            .orderBy('deliveredAt', 'desc')
            .get();

        const userMessages: UserMessage[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as UserMessageDocument;
            const userMessage = this.documentToUserMessage(data);
            userMessages.push(userMessage);
        });

        return UserMessageCollection.create(userMessages);
    }

    async findByUserAndMessage(userId: UserId, messageId: MessageId): Promise<UserMessage | null> {
        const userIdValue = userId.getValue();
        const messageIdValue = messageId.getValue();
        this.logger.debug(`DBからユーザー・メッセージ組み合わせを取得: ${userIdValue}, ${messageIdValue}`);

        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('userId', '==', userIdValue)
            .where('messageId', '==', messageIdValue)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        const data = doc.data() as UserMessageDocument;
        return this.documentToUserMessage(data);
    }

    async findByFilter(filter: {
        userId?: string;
        messageId?: string;
        isRead?: boolean;
        type?: MessageTypeValue | 'all';
        limit?: number;
        offset?: number;
    }): Promise<UserMessageCollection> {
        this.logger.debug(`DBからフィルタ条件でユーザーメッセージを取得: ${JSON.stringify(filter)}`);

        const { db } = await getDbAndAuth();
        let query = db.collection(this.tableName) as any;

        console.log('get query fase 1');

        // フィルタ条件を追加
        if (filter.userId) {
            query = query.where('userId', '==', filter.userId);
        }

        if (filter.messageId) {
            query = query.where('messageId', '==', filter.messageId);
        }

        if (filter.isRead !== undefined) {
            query = query.where('isRead', '==', filter.isRead);
        }

        if (filter.type && filter.type !== 'all') {
            query = query.where('messageType', '==', filter.type);
        }

        console.log('get query fase 2');

        // 並び替え
        query = query.orderBy('deliveredAt', 'desc');

        console.log('get query fase 3');

        // ページネーション
        if (filter.offset) {
            query = query.offset(filter.offset);
        }

        if (filter.limit) {
            query = query.limit(filter.limit);
        }
        console.log('get query');

        let snapshot;
        try {
            snapshot = await query.get();
        } catch (error) {
            console.error('Error getting documents:', error);
            throw error;
        }

        const userMessages: UserMessage[] = [];
        snapshot.forEach((doc: any) => {
            const data = doc.data() as UserMessageDocument;
            this.logger.debug(`ユーザーメッセージ取得完了: ${JSON.stringify(data)}`);
            const userMessage = this.documentToUserMessage(data);
            this.logger.debug(`ユーザーメッセージ変換完了: ${JSON.stringify(userMessage)}`);
            userMessages.push(userMessage);
        });

        return UserMessageCollection.create(userMessages);
    }

    async update(userMessage: UserMessage): Promise<void> {
        await this.save(userMessage);
    }

    async delete(id: UserMessageId): Promise<void> {
        const { db } = await getDbAndAuth();
        const userMessageId = id.getValue();

        await db.collection(this.tableName).doc(userMessageId).delete();

        this.logger.debug(`ユーザーメッセージ削除完了: ${userMessageId}`);
    }

    async saveMultiple(userMessages: UserMessage[]): Promise<void> {
        if (userMessages.length === 0) {
            return;
        }

        const { db } = await getDbAndAuth();
        const batch = db.batch();

        // メッセージ情報を一括取得（非正規化のため）
        const messageIds = [...new Set(userMessages.map((um) => um.getMessageId().getValue()))];
        const messageDocsPromises = messageIds.map((id) => db.collection('Messages').doc(id).get());
        const messageDocs = await Promise.all(messageDocsPromises);

        const messageDataMap = new Map<string, any>();
        messageDocs.forEach((doc) => {
            if (doc.exists) {
                messageDataMap.set(doc.id, doc.data());
            }
        });

        for (const userMessage of userMessages) {
            const messageData = messageDataMap.get(userMessage.getMessageId().getValue());
            if (!messageData) {
                this.logger.warn(`Message not found for denormalization: ${userMessage.getMessageId().getValue()}`);
                continue;
            }

            const record: UserMessageDocument = {
                userMessageId: userMessage.getId().getValue(),
                userId: userMessage.getUserId().getValue(),
                messageId: userMessage.getMessageId().getValue(),
                deliveredAt: userMessage.getDeliveredAt().toISOString(),
                readAt: userMessage.getReadAt().toISOString() || null,
                isRead: userMessage.getReadAt().isRead(),
                // 非正規化データ
                messageType: messageData.type || 'ai',
                messageSubject: messageData.subject || '',
                senderUserId: messageData.senderUserId || '',
            };

            const docRef = db.collection(this.tableName).doc(userMessage.getId().getValue());
            batch.set(docRef, record);
        }

        await batch.commit();
        this.logger.debug(`ユーザーメッセージ一括保存完了: ${userMessages.length}件`);
    }

    async markAsRead(userId: UserId, messageId: MessageId): Promise<void> {
        const userMessage = await this.findByUserAndMessage(userId, messageId);
        if (!userMessage) {
            throw new Error(`UserMessage not found: userId=${userId.getValue()}, messageId=${messageId.getValue()}`);
        }

        if (userMessage.isUnread()) {
            const updateMessage = userMessage.markAsRead();
            await this.update(updateMessage);
        }
    }

    async markMultipleAsRead(userId: UserId, messageIds: MessageId[]): Promise<void> {
        if (messageIds.length === 0) {
            return;
        }

        const { db } = await getDbAndAuth();
        const batch = db.batch();
        const now = new Date().toISOString();

        for (const messageId of messageIds) {
            const snapshot = await db
                .collection(this.tableName)
                .where('userId', '==', userId.getValue())
                .where('messageId', '==', messageId.getValue())
                .where('isRead', '==', false)
                .get();

            snapshot.forEach((doc) => {
                batch.update(doc.ref, {
                    readAt: now,
                    isRead: true,
                });
            });
        }

        await batch.commit();
        this.logger.debug(`ユーザー複数メッセージ既読化完了: ${messageIds.length}件`);
    }

    async markAllAsReadByUser(userId: UserId): Promise<void> {
        const userIdValue = userId.getValue();
        this.logger.debug(`ユーザー全メッセージ既読化: ${userIdValue}`);

        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('userId', '==', userIdValue)
            .where('isRead', '==', false)
            .get();

        if (snapshot.empty) {
            return;
        }

        const batch = db.batch();
        const now = new Date().toISOString();

        snapshot.forEach((doc) => {
            batch.update(doc.ref, {
                readAt: now,
                isRead: true,
            });
        });

        await batch.commit();
        this.logger.debug(`ユーザー全メッセージ既読化完了: ${snapshot.size}件`);
    }

    async markAllAsReadByUserAndType(userId: UserId, type: MessageType): Promise<void> {
        const userIdValue = userId.getValue();
        const typeValue = type.getValue();
        this.logger.debug(`ユーザー・タイプ別全メッセージ既読化: ${userIdValue}, ${typeValue}`);

        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('userId', '==', userIdValue)
            .where('messageType', '==', typeValue)
            .where('isRead', '==', false)
            .get();

        if (snapshot.empty) {
            return;
        }

        const batch = db.batch();
        const now = new Date().toISOString();

        snapshot.forEach((doc) => {
            batch.update(doc.ref, {
                readAt: now,
                isRead: true,
            });
        });

        await batch.commit();
        this.logger.debug(`ユーザー・タイプ別全メッセージ既読化完了: ${snapshot.size}件`);
    }

    async getUnreadCountByUserId(userId: UserId): Promise<number> {
        const userIdValue = userId.getValue();
        this.logger.debug(`DBからユーザー未読件数を取得: ${userIdValue}`);

        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('userId', '==', userIdValue)
            .where('isRead', '==', false)
            .get();

        return snapshot.size;
    }

    async getUnreadCountByUserIdAndType(userId: UserId, type: MessageTypeValue): Promise<number> {
        const userIdValue = userId.getValue();
        this.logger.debug(`DBからユーザー・タイプ別未読件数を取得: ${userIdValue}, ${type}`);

        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('userId', '==', userIdValue)
            .where('messageType', '==', type)
            .where('isRead', '==', false)
            .get();

        return snapshot.size;
    }

    async getDeliveryStats(messageId: MessageId): Promise<{
        totalDelivered: number;
        totalRead: number;
        totalUnread: number;
        readRate: number;
    }> {
        const messageIdValue = messageId.getValue();
        this.logger.debug(`DBからメッセージ配信統計を取得: ${messageIdValue}`);

        const { db } = await getDbAndAuth();
        const snapshot = await db.collection(this.tableName).where('messageId', '==', messageIdValue).get();

        let totalRead = 0;
        let totalUnread = 0;

        snapshot.forEach((doc) => {
            const data = doc.data() as UserMessageDocument;
            if (data.isRead) {
                totalRead++;
            } else {
                totalUnread++;
            }
        });

        const totalDelivered = totalRead + totalUnread;
        const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

        return {
            totalDelivered,
            totalRead,
            totalUnread,
            readRate,
        };
    }

    async existsByUserAndMessage(userId: UserId, messageId: MessageId): Promise<boolean> {
        const userMessage = await this.findByUserAndMessage(userId, messageId);
        return userMessage !== null;
    }

    async deleteOlderThan(date: Date): Promise<number> {
        const isoString = date.toISOString();
        this.logger.debug(`古いユーザーメッセージ削除: ${isoString}より前`);

        const { db } = await getDbAndAuth();
        const snapshot = await db.collection(this.tableName).where('deliveredAt', '<', isoString).get();

        if (snapshot.empty) {
            return 0;
        }

        const batch = db.batch();
        snapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        this.logger.debug(`古いユーザーメッセージ削除完了: ${snapshot.size}件`);

        return snapshot.size;
    }

    private documentToUserMessage(data: UserMessageDocument): UserMessage {
        return UserMessage.reconstruct(
            UserMessageId.fromExisting(data.userMessageId),
            UserId.fromExisting(data.userId),
            MessageId.fromExisting(data.messageId),
            DeliveredAt.fromISOString(data.deliveredAt),
            ReadAt.fromISOString(data.readAt || null),
        );
    }
}
