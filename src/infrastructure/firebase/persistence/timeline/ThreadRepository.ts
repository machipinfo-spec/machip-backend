import { getDbAndAuth } from '../../config/firebaseAdmin';
import { Thread, ThreadDTO } from '../../../../domain/entities/timeline/thread';
import { ThreadId } from '../../../../domain/value-object/timeline/threadId';
import { ThreadName } from '../../../../domain/value-object/map/threadName';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { IThreadRepository } from '../../../../domain/repositories/timeline/IThreadRepository';
import { PointInfoId } from '../../../../domain/value-object/map/pointInfoId';

export class ThreadRepository implements IThreadRepository {
    private readonly tableName = 'threads';

    async save(thread: Thread): Promise<void> {
        const dto: ThreadDTO = thread.toPrimitives();
        const record = {
            id: dto.id,
            threadName: dto.threadName,
            createdAt: dto.createdAt,
            deleatedAt: dto.deleatedAt,
            ownerUserId: dto.ownerUserId,
            parentThreadId: dto.parentThreadId,
            childThreadIds: dto.childThreadIds,
            mapPointInfoId: dto.mapPointInfoId,
            imageUrl: dto.imageUrl || null
        };

        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(dto.id).set(record);
    }

    async findById(threadId: string): Promise<Thread | null> {
        const { db } = await getDbAndAuth();
        const docRef = await db.collection(this.tableName).doc(threadId).get();

        if (!docRef.exists) return null;
        const data = docRef.data();
        if (!data) return null;

        return this.mapToThread(docRef.id, data);
    }

    async findByOwnerUserId(ownerUserId: string, limit = 50): Promise<Thread[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('ownerUserId', '==', ownerUserId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        return this.mapDocsToThreads(snapshot);
    }

    async findByParentThreadId(parentThreadId: string, limit = 50): Promise<Thread[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('parentThreadId', '==', parentThreadId)
            .orderBy('createdAt', 'asc')
            .limit(limit)
            .get();

        return this.mapDocsToThreads(snapshot);
    }

    async findRootThreads(limit = 50): Promise<Thread[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('parentThreadId', '==', null)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        return this.mapDocsToThreads(snapshot);
    }

    private mapToThread(docId: string, data: any): Thread {
        const parentThreadId = data.parentThreadId 
            ? ThreadId.fromExisting(data.parentThreadId)
            : null;

        const childThreadIds = (data.childThreadIds || []).map((id: string) => 
            ThreadId.fromExisting(id)
        );

        return Thread.fromExisting(
            ThreadId.fromExisting(docId),
            ThreadName.create(data.threadName),
            data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt,
            data.deleatedAt ? (data.deleatedAt.toDate ? data.deleatedAt.toDate() : data.deleatedAt) : null,
            UserId.fromExisting(data.ownerUserId),
            parentThreadId,
            childThreadIds,
            data.mapPointInfoId ? PointInfoId.fromExisting(data.mapPointInfoId) : null,
            data.imageUrl || null,
            data.selectDate ? (data.selectDate.toDate ? data.selectDate.toDate() : data.selectDate) : null
        );
    }

    async delete(threadId: string): Promise<void> {
        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(threadId).delete();
    }

    async softDelete(threadId: string): Promise<void> {
        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(threadId).update({
            deleatedAt: new Date()
        });
    }

    private mapDocsToThreads(snapshot: any): Thread[] {
        const results: Thread[] = [];
        snapshot.forEach((doc: any) => {
            const data = doc.data();
            if (!data) return;
            results.push(this.mapToThread(doc.id, data));
        });
        return results;
    }
}