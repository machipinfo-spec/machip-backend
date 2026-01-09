// infrastructure/repositories/firestore/MessageBroadcastRepository.ts

import { MessageBroadcast } from '../../../../domain/entities/inbox/MessageBroadcast';
import { IMessageBroadcastRepository } from '../../../../domain/repositories/inbox/IMessageBroadcastRepository';
import { BroadcastId } from '../../../../domain/value-object/inbox/BroadcastId';
import { BroadcastStatusValue, BroadcastStatus } from '../../../../domain/value-object/inbox/BroadcastStatus';
import { CreatedAt } from '../../../../domain/value-object/inbox/CreatedAt';
import { MessageId } from '../../../../domain/value-object/inbox/MessageId';
import { TargetUserIds } from '../../../../domain/value-object/inbox/TargetUserIds';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { Logger } from '../../../../shared/logger';
import { getDbAndAuth } from '../../config/firebaseAdmin';

interface MessageBroadcastDocument {
    broadcastId: string;
    messageId: string;
    targetUserIds: string[];
    createdAt: string;
    status: BroadcastStatusValue;
    deliveredCount: number;
    failedCount: number;
    completedAt?: string | null;
    // 非正規化データ（検索・表示用）
    messageSubject: string;
    messageType: string;
    senderName: string;
}

export class MessageBroadcastRepository implements IMessageBroadcastRepository {
    private readonly tableName = 'MessageBroadcasts';
    private readonly logger: Logger;

    constructor(loggerInstance?: Logger) {
        this.logger = loggerInstance || new Logger('MessageBroadcastRepository');
    }

    async save(broadcast: MessageBroadcast): Promise<void> {
        // メッセージ情報を取得（非正規化のため）
        const { db } = await getDbAndAuth();
        const messageDoc = await db.collection('Messages').doc(broadcast.getMessageId().getValue()).get();

        if (!messageDoc.exists) {
            throw new Error(`Message not found: ${broadcast.getMessageId().getValue()}`);
        }

        const messageData = messageDoc.data();

        const record: MessageBroadcastDocument = {
            broadcastId: broadcast.getId().getValue(),
            messageId: broadcast.getMessageId().getValue(),
            targetUserIds: broadcast
                .getTargetUserIds()
                .getUserIds()
                .map((id) => id.getValue()),
            createdAt: broadcast.getCreatedAt().toISOString(),
            status: broadcast.getStatus().getValue(),
            deliveredCount: broadcast.getDeliveredCount(),
            failedCount: broadcast.getFailedCount(),
            completedAt: broadcast.getCompletedAt()?.toISOString() || null,
            // 非正規化データ
            messageSubject: messageData?.subject || '',
            messageType: messageData?.type || 'ai',
            senderName: messageData?.senderName || '',
        };

        await db.collection(this.tableName).doc(broadcast.getId().getValue()).set(record);

        this.logger.debug(`ブロードキャスト保存完了: ${JSON.stringify(record)}`);
    }

    async findById(id: BroadcastId): Promise<MessageBroadcast | null> {
        const broadcastId = id.getValue();
        this.logger.debug(`DBからブロードキャストを取得: ${broadcastId}`);

        const { db } = await getDbAndAuth();
        const docRef = await db.collection(this.tableName).doc(broadcastId).get();

        if (!docRef.exists) {
            return null;
        }

        const data = docRef.data() as MessageBroadcastDocument;
        return this.documentToBroadcast(data);
    }

    async findByMessageId(messageId: MessageId): Promise<MessageBroadcast[]> {
        const messageIdValue = messageId.getValue();
        this.logger.debug(`DBからメッセージID別ブロードキャストを取得: ${messageIdValue}`);

        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('messageId', '==', messageIdValue)
            .orderBy('createdAt', 'desc')
            .get();

        const broadcasts: MessageBroadcast[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as MessageBroadcastDocument;
            const broadcast = this.documentToBroadcast(data);
            broadcasts.push(broadcast);
        });

        return broadcasts;
    }

    async findByStatus(status: BroadcastStatus): Promise<MessageBroadcast[]> {
        const statusValue = status.getValue();
        this.logger.debug(`DBからステータス別ブロードキャストを取得: ${statusValue}`);

        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('status', '==', statusValue)
            .orderBy('createdAt', 'desc')
            .get();

        const broadcasts: MessageBroadcast[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as MessageBroadcastDocument;
            const broadcast = this.documentToBroadcast(data);
            broadcasts.push(broadcast);
        });

        return broadcasts;
    }

    async findPendingBroadcasts(): Promise<MessageBroadcast[]> {
        return this.findByStatus(BroadcastStatus.pending());
    }

    async findProcessingBroadcasts(): Promise<MessageBroadcast[]> {
        return this.findByStatus(BroadcastStatus.processing());
    }

    async findAll(limit?: number, offset?: number): Promise<MessageBroadcast[]> {
        this.logger.debug('DBから全ブロードキャストを取得');
        const { db } = await getDbAndAuth();

        let query = db.collection(this.tableName).orderBy('createdAt', 'desc') as any;

        if (offset) {
            query = query.offset(offset);
        }

        if (limit) {
            query = query.limit(limit);
        }

        const snapshot = await query.get();

        const broadcasts: MessageBroadcast[] = [];
        snapshot.forEach((doc: any) => {
            const data = doc.data() as MessageBroadcastDocument;
            const broadcast = this.documentToBroadcast(data);
            broadcasts.push(broadcast);
        });

        return broadcasts;
    }

    async update(broadcast: MessageBroadcast): Promise<void> {
        await this.save(broadcast);
    }

    async delete(id: BroadcastId): Promise<void> {
        const { db } = await getDbAndAuth();
        const broadcastId = id.getValue();

        await db.collection(this.tableName).doc(broadcastId).delete();

        this.logger.debug(`ブロードキャスト削除完了: ${broadcastId}`);
    }

    async exists(id: BroadcastId): Promise<boolean> {
        const broadcastId = id.getValue();
        const { db } = await getDbAndAuth();
        const docRef = await db.collection(this.tableName).doc(broadcastId).get();

        return docRef.exists;
    }

    async getStats(): Promise<{
        totalBroadcasts: number;
        pendingCount: number;
        processingCount: number;
        completedCount: number;
        failedCount: number;
    }> {
        this.logger.debug('DBからブロードキャスト統計を取得');
        const { db } = await getDbAndAuth();
        const snapshot = await db.collection(this.tableName).get();

        const stats = {
            totalBroadcasts: 0,
            pendingCount: 0,
            processingCount: 0,
            completedCount: 0,
            failedCount: 0,
        };

        snapshot.forEach((doc) => {
            const data = doc.data() as MessageBroadcastDocument;
            stats.totalBroadcasts++;

            switch (data.status) {
                case 'pending':
                    stats.pendingCount++;
                    break;
                case 'processing':
                    stats.processingCount++;
                    break;
                case 'completed':
                    stats.completedCount++;
                    break;
                case 'failed':
                    stats.failedCount++;
                    break;
            }
        });

        return stats;
    }

    async deleteOlderThan(date: Date): Promise<number> {
        const isoString = date.toISOString();
        this.logger.debug(`古いブロードキャスト削除: ${isoString}より前`);

        const { db } = await getDbAndAuth();
        const snapshot = await db.collection(this.tableName).where('createdAt', '<', isoString).get();

        if (snapshot.empty) {
            return 0;
        }

        const batch = db.batch();
        snapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        this.logger.debug(`古いブロードキャスト削除完了: ${snapshot.size}件`);

        return snapshot.size;
    }

    async findFailedBroadcastsForRetry(retryAfterHours: number): Promise<MessageBroadcast[]> {
        const retryAfterDate = new Date();
        retryAfterDate.setHours(retryAfterDate.getHours() - retryAfterHours);
        const isoString = retryAfterDate.toISOString();

        this.logger.debug(`DBから再試行対象の失敗ブロードキャストを取得: ${isoString}より前`);

        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('status', '==', 'failed')
            .where('completedAt', '<', isoString)
            .orderBy('completedAt', 'asc')
            .limit(100) // 一度に処理する件数を制限
            .get();

        const broadcasts: MessageBroadcast[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as MessageBroadcastDocument;
            const broadcast = this.documentToBroadcast(data);
            broadcasts.push(broadcast);
        });

        return broadcasts;
    }

    private documentToBroadcast(data: MessageBroadcastDocument): MessageBroadcast {
        const targetUserIds = TargetUserIds.create(data.targetUserIds.map((id) => UserId.fromExisting(id)));

        return MessageBroadcast.reconstruct(
            BroadcastId.fromExisting(data.broadcastId),
            MessageId.fromExisting(data.messageId),
            targetUserIds,
            CreatedAt.fromISOString(data.createdAt),
            new BroadcastStatus(data.status),
            data.deliveredCount,
            data.failedCount,
            data.completedAt ? new Date(data.completedAt) : undefined,
        );
    }
}
