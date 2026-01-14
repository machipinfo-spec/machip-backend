// infrastructure/repositories/firestore/MessageRepository.ts (更新版)
// ユーザー配信機能に対応

import { Message, MessageContent } from '../../../../domain/entities/inbox/Message';
import { MessageCollection } from '../../../../domain/entities/inbox/MessageCollection';
import { IMessageRepository } from '../../../../domain/repositories/inbox/IMessageRepository';
import { CreatedAt } from '../../../../domain/value-object/inbox/CreatedAt';
import { SystemMessageContent } from '../../../../domain/value-object/inbox/SystemMessageContent';
import { ReplyMessageContent } from '../../../../domain/value-object/inbox/ReplyMessageContent';
import { NewEventMessageContent } from '../../../../domain/value-object/inbox/NewEventMessageContent';
import { MessageId } from '../../../../domain/value-object/inbox/MessageId';
import { MessageSubject } from '../../../../domain/value-object/inbox/MessageSubject';
import { MessageTypeValue, MessageType } from '../../../../domain/value-object/inbox/MessageType';
import { ReadStatus } from '../../../../domain/value-object/inbox/ReadStatus';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { Logger } from '../../../../shared/logger';
import { getDbAndAuth } from '../../config/firebaseAdmin';

interface MessageDocument {
    messageId: string;
    type: MessageTypeValue;
    subject: string;
    content: string;
    senderUserId: string;
    createdAt: string;
    isRead: boolean; // 廃止予定（後方互換性のため残す）
}

export class MessageRepository implements IMessageRepository {
    private readonly tableName = 'Messages';
    private readonly logger: Logger;

    constructor(loggerInstance?: Logger) {
        this.logger = loggerInstance || new Logger('MessageRepository');
    }

    async save(message: Message): Promise<void> {
        const record: MessageDocument = {
            messageId: message.getId().getValue(),
            type: message.getType().getValue(),
            subject: message.getSubject().getValue(),
            content: message.getContent().toJSON(),
            senderUserId: message.getSenderUserId().getValue(),
            createdAt: message.getCreatedAt().toISOString(),
            isRead: false, // 初期値（個別の既読管理はUserMessageで行う）
        };

        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(message.getId().getValue()).set(record);

        this.logger.debug(`メッセージ保存完了: ${JSON.stringify(record)}`);
    }

    async findById(id: MessageId): Promise<Message | null> {
        const messageId = id.getValue();
        this.logger.debug(`DBからメッセージを取得: ${messageId}`);

        const { db } = await getDbAndAuth();
        const docRef = await db.collection(this.tableName).doc(messageId).get();

        if (!docRef.exists) {
            return null;
        }

        const data = docRef.data() as MessageDocument;
        return this.documentToMessage(data);
    }

    async findAll(): Promise<MessageCollection> {
        this.logger.debug('DBから全メッセージを取得');
        const { db } = await getDbAndAuth();
        const snapshot = await db.collection(this.tableName).orderBy('createdAt', 'desc').get();

        const messages: Message[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as MessageDocument;
            const message = this.documentToMessage(data);
            messages.push(message);
        });

        return MessageCollection.create(messages);
    }

    async findByType(type: MessageType): Promise<MessageCollection> {
        const typeValue = type.getValue();
        this.logger.debug(`DBからタイプ別メッセージを取得: ${typeValue}`);

        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('type', '==', typeValue)
            .orderBy('createdAt', 'desc')
            .get();

        const messages: Message[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as MessageDocument;
            const message = this.documentToMessage(data);
            messages.push(message);
        });

        return MessageCollection.create(messages);
    }

    async findBySenderId(senderUserId: string): Promise<MessageCollection> {
        this.logger.debug(`findBySenderId: Start searching for senderUserId: ${senderUserId}`);
        const { db } = await getDbAndAuth();

        try {
            const snapshot = await db
                .collection(this.tableName)
                .where('senderUserId', '==', senderUserId)
                .orderBy('createdAt', 'desc')
                .get();

            this.logger.debug(`findBySenderId: Query executed. Found ${snapshot.size} documents.`);

            const messages: Message[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data() as MessageDocument;
                const message = this.documentToMessage(data);
                messages.push(message);
            });

            return MessageCollection.create(messages);
        } catch (error) {
            this.logger.error(`findBySenderId: Error fetching messages`, error);
            throw error;
        }
    }

    async findByFilter(filter: {
        type?: MessageTypeValue | 'all';
        senderId?: string;
        limit?: number;
        offset?: number;
        searchText?: string;
    }): Promise<MessageCollection> {
        this.logger.debug(`DBからフィルタ条件でメッセージを取得: ${JSON.stringify(filter)}`);

        const { db } = await getDbAndAuth();
        let query = db.collection(this.tableName) as any;

        // フィルタ条件を追加
        if (filter.type && filter.type !== 'all') {
            query = query.where('type', '==', filter.type);
        }

        if (filter.senderId) {
            query = query.where('senderId', '==', filter.senderId);
        }

        // 検索条件（簡易版：完全一致のみ）
        if (filter.searchText) {
            // Firestoreでは部分一致検索が制限されているため、
            // アプリケーション側でフィルタリングするか、
            // より高度な検索には Algolia などの外部サービスを使用する
            query = query
                .where('subject', '>=', filter.searchText)
                .where('subject', '<=', filter.searchText + '\uf8ff');
        }

        // 並び替え
        query = query.orderBy('createdAt', 'desc');

        // ページネーション
        if (filter.offset) {
            query = query.offset(filter.offset);
        }

        if (filter.limit) {
            query = query.limit(filter.limit);
        }

        const snapshot = await query.get();

        const messages: Message[] = [];
        snapshot.forEach((doc: any) => {
            const data = doc.data() as MessageDocument;
            const message = this.documentToMessage(data);
            messages.push(message);
        });

        return MessageCollection.create(messages);
    }

    async findDeliveredToUser(
        userId: UserId,
        filter?: {
            type?: MessageTypeValue | 'all';
            isRead?: boolean;
            limit?: number;
            offset?: number;
        },
    ): Promise<MessageCollection> {
        const userIdValue = userId.getValue();
        this.logger.debug(`DBからユーザー配信メッセージを取得: ${userIdValue}`);

        const { db } = await getDbAndAuth();

        // UserMessagesコレクションから該当のメッセージIDを取得
        let userMessageQuery = db.collection('UserMessages').where('userId', '==', userIdValue) as any;

        if (filter?.isRead !== undefined) {
            userMessageQuery = userMessageQuery.where('isRead', '==', filter.isRead);
        }

        if (filter?.type && filter.type !== 'all') {
            userMessageQuery = userMessageQuery.where('messageType', '==', filter.type);
        }

        userMessageQuery = userMessageQuery.orderBy('deliveredAt', 'desc');

        if (filter?.offset) {
            userMessageQuery = userMessageQuery.offset(filter.offset);
        }

        if (filter?.limit) {
            userMessageQuery = userMessageQuery.limit(filter.limit);
        }

        const userMessageSnapshot = await userMessageQuery.get();

        if (userMessageSnapshot.empty) {
            return MessageCollection.create([]);
        }

        // メッセージIDを収集
        const messageIds: string[] = [];
        userMessageSnapshot.forEach((doc: any) => {
            const data = doc.data();
            messageIds.push(data.messageId);
        });

        // メッセージ詳細を取得（バッチ処理）
        const messages: Message[] = [];
        const batchSize = 10; // Firestoreの in クエリ制限

        for (let i = 0; i < messageIds.length; i += batchSize) {
            const batch = messageIds.slice(i, i + batchSize);
            const messageSnapshot = await db.collection(this.tableName).where('messageId', 'in', batch).get();

            messageSnapshot.forEach((doc) => {
                const data = doc.data() as MessageDocument;
                const message = this.documentToMessage(data);
                messages.push(message);
            });
        }

        // UserMessageの順序を保持するためのソート
        const sortedMessages = messageIds
            .map((id) => messages.find((msg) => msg.getId().getValue() === id))
            .filter(Boolean) as Message[];

        return MessageCollection.create(sortedMessages);
    }

    async update(message: Message): Promise<void> {
        await this.save(message);
    }

    async delete(id: MessageId): Promise<void> {
        const { db } = await getDbAndAuth();
        const messageId = id.getValue();

        // メッセージに関連するUserMessageとMessageBroadcastも削除
        const batch = db.batch();

        // メッセージ本体の削除
        const messageRef = db.collection(this.tableName).doc(messageId);
        batch.delete(messageRef);

        // 関連するUserMessageの削除
        const userMessageSnapshot = await db.collection('UserMessages').where('messageId', '==', messageId).get();

        userMessageSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // 関連するMessageBroadcastの削除
        const broadcastSnapshot = await db.collection('MessageBroadcasts').where('messageId', '==', messageId).get();

        broadcastSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        this.logger.debug(`メッセージおよび関連データ削除完了: ${messageId}`);
    }

    async exists(id: MessageId): Promise<boolean> {
        const messageId = id.getValue();
        const { db } = await getDbAndAuth();
        const docRef = await db.collection(this.tableName).doc(messageId).get();

        return docRef.exists;
    }

    async count(): Promise<number> {
        this.logger.debug('DBからメッセージ総数を取得');
        const { db } = await getDbAndAuth();
        const snapshot = await db.collection(this.tableName).get();

        return snapshot.size;
    }

    async deleteOlderThan(date: Date): Promise<number> {
        const isoString = date.toISOString();
        this.logger.debug(`古いメッセージ削除: ${isoString}より前`);

        const { db } = await getDbAndAuth();
        const snapshot = await db.collection(this.tableName).where('createdAt', '<', isoString).get();

        if (snapshot.empty) {
            return 0;
        }

        // 関連データも含めて削除
        let deletedCount = 0;
        const batchSize = 500; // Firestore batch limit

        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = db.batch();
            const batchDocs = snapshot.docs.slice(i, i + batchSize);

            for (const doc of batchDocs) {
                const messageId = doc.data().messageId;

                // メッセージ削除
                batch.delete(doc.ref);

                // 関連するUserMessage削除
                const userMessageSnapshot = await db
                    .collection('UserMessages')
                    .where('messageId', '==', messageId)
                    .get();

                userMessageSnapshot.forEach((umDoc) => {
                    batch.delete(umDoc.ref);
                });

                // 関連するMessageBroadcast削除
                const broadcastSnapshot = await db
                    .collection('MessageBroadcasts')
                    .where('messageId', '==', messageId)
                    .get();

                broadcastSnapshot.forEach((bcDoc) => {
                    batch.delete(bcDoc.ref);
                });

                deletedCount++;
            }

            await batch.commit();
        }

        this.logger.debug(`古いメッセージおよび関連データ削除完了: ${deletedCount}件`);

        return deletedCount;
    }

    async search(
        searchText: string,
        filter?: {
            type?: MessageTypeValue | 'all';
            limit?: number;
            offset?: number;
        },
    ): Promise<MessageCollection> {
        this.logger.debug(`DBからメッセージ検索: ${searchText}`);

        // 簡易検索実装（件名での部分一致）
        // 実用的な検索機能には Algolia などの外部検索サービスの使用を推奨
        const { db } = await getDbAndAuth();
        let query = db.collection(this.tableName) as any;

        if (filter?.type && filter.type !== 'all') {
            query = query.where('type', '==', filter.type);
        }

        // 部分一致検索のためにすべてのドキュメントを取得してフィルタリング
        query = query.orderBy('createdAt', 'desc');

        if (filter?.limit) {
            query = query.limit(filter.limit * 2); // 検索でフィルタリングされることを考慮
        }

        const snapshot = await query.get();

        const messages: Message[] = [];
        let count = 0;
        const skipCount = filter?.offset || 0;
        const limitCount = filter?.limit || Number.MAX_SAFE_INTEGER;

        snapshot.forEach((doc: any) => {
            const data = doc.data() as MessageDocument;

            // 件名または本文に検索文字列が含まれているかチェック
            const searchLower = searchText.toLowerCase();
            const subjectMatch = data.subject.toLowerCase().includes(searchLower);
            const contentMatch = data.content.toLowerCase().includes(searchLower);

            if (subjectMatch || contentMatch) {
                if (count >= skipCount && messages.length < limitCount) {
                    const message = this.documentToMessage(data);
                    messages.push(message);
                }
                count++;
            }
        });

        return MessageCollection.create(messages);
    }

    private documentToMessage(data: MessageDocument): Message {
        const messageType =
            data.type === 'system'
                ? MessageType.system()
                : data.type === 'reply'
                ? MessageType.reply()
                : data.type === 'newEvent'
                ? MessageType.newEvent()
                : MessageType.ai();

        // Parse content based on type
        let content: MessageContent;
        if (data.type === 'system' || data.type === 'ai') {
            // Try to parse as JSON first, fallback to legacy string format
            try {
                content = SystemMessageContent.fromJSON(data.content);
            } catch {
                // Legacy format: plain string
                content = SystemMessageContent.create(data.content);
            }
        } else if (data.type === 'reply') {
            content = ReplyMessageContent.fromJSON(data.content);
        } else if (data.type === 'newEvent') {
            content = NewEventMessageContent.fromJSON(data.content);
        } else {
            throw new Error(`Unknown message type: ${data.type}`);
        }

        return Message.reconstruct(
            MessageId.fromExisting(data.messageId),
            messageType,
            MessageSubject.create(data.subject),
            content,
            UserId.fromExisting(data.senderUserId),
            CreatedAt.fromISOString(data.createdAt),
            ReadStatus.read(), // メッセージ自体の既読管理は廃止、UserMessageで管理
        );
    }
}
