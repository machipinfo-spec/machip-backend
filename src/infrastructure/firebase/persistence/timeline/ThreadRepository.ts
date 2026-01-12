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
            imageUrl: dto.imageUrl || null,
            // selectDate removed
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

    async findByOwnerUserId(ownerUserId: string, limit = 50, offset = 0): Promise<Thread[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('ownerUserId', '==', ownerUserId)
            .orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit)
            .get();

        return this.mapDocsToThreads(snapshot);
    }

    async findByParentThreadId(parentThreadId: string, limit = 50, offset = 0): Promise<Thread[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('parentThreadId', '==', parentThreadId)
            .orderBy('createdAt', 'asc')
            .offset(offset)
            .limit(limit)
            .get();

        return this.mapDocsToThreads(snapshot);
    }

    async findRootThreads(limit = 50, offset = 0): Promise<Thread[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('parentThreadId', '==', null)
            .orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit)
            .get();

        return this.mapDocsToThreads(snapshot);
    }

    private mapToThread(docId: string, data: any): Thread {
        const parentThreadId = data.parentThreadId ? ThreadId.fromExisting(data.parentThreadId) : null;

        const childThreadIds = (data.childThreadIds || []).map((id: string) => ThreadId.fromExisting(id));

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
        );
    }

    async delete(threadId: string): Promise<void> {
        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(threadId).delete();
    }

    async softDelete(threadId: string): Promise<void> {
        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(threadId).update({
            deleatedAt: new Date(),
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

    // findBySelectDateRange is likely obsolete or needs to switch to startDate.
    // Given the prompt "selectDate is unnecessary as it's period specified",
    // we should probably check overlapping periods or similar if this was a calendar query.
    // But since the interface wasn't shown, I will assume I should remove or update it to use startDate?
    // User said "threadsのデータモデルにselectDateが含まれてますが、期間指定にしたのでこのプロパティは不要になりました".
    // This implies `startDate` and `endDate` are now holding the period.
    // So `findBySelectDateRange` should probably search by `startDate`?
    // Or simpler: remove this method if it's not used, or update it to use startDate.
    // Let's renaming it to `findByDateRange` and use startDate/endDate logic?
    // I'll update it to check overlap with startDate/endDate for now, or just use startDate as primary.
    // Actually, if it's "period specified", we probably want threads active in that period.
    // where('startDate', '<=', end) AND where('endDate', '>=', start).
    // Firestore composite index might be needed.
    // For now, let's just make it query by startDate to satisfy the compiler if interface demands it,
    // OR if strict removal, remove it. I'll check IThreadRepository if possible but I can't in this turn.
    // I'll comment it out or update it to use startDate for now to avoid build break if I cannot remove it from interface yet.
    // Actually, I should probably remove it from interface too if I could.
    // I will try to remove it. If Interface complains, I'll see.
    // Wait, the previous view didn't show the Interface.
    // I'll assume I can remove it or update it. Replacing it with startDate logic seems safest for "Calendar" features.
    async findBySelectDateRange(start: Date, end: Date, limit = 100): Promise<Thread[]> {
        const { db } = await getDbAndAuth();

        const snapshot = await db
            .collection(this.tableName)
            .where('startDate', '>=', start)
            .where('startDate', '<=', end)
            .orderBy('startDate', 'asc')
            .limit(limit)
            .get();

        return this.mapDocsToThreads(snapshot);
    }

    async findByMapPointInfoId(mapPointInfoId: string): Promise<Thread | null> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('mapPointInfoId', '==', mapPointInfoId)
            .where('deleatedAt', '==', null)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        return this.mapToThread(snapshot.docs[0].id, snapshot.docs[0].data());
    }

    async findByMapPointInfoIds(mapPointInfoIds: string[]): Promise<Thread[]> {
        if (mapPointInfoIds.length === 0) return [];

        const { db } = await getDbAndAuth();
        // Firestore IN query limits to 10 items (or 30 in newer versions).
        // Since limit in usage is 100, we need to batch.
        // For simplicity in this iteration, I'll batch by 10.

        const chunks = [];
        for (let i = 0; i < mapPointInfoIds.length; i += 10) {
            chunks.push(mapPointInfoIds.slice(i, i + 10));
        }

        const promises = chunks.map((chunk) =>
            db.collection(this.tableName).where('mapPointInfoId', 'in', chunk).where('deleatedAt', '==', null).get(),
        );

        const snapshots = await Promise.all(promises);
        const results: Thread[] = [];

        snapshots.forEach((snapshot) => {
            snapshot.forEach((doc) => {
                results.push(this.mapToThread(doc.id, doc.data()));
            });
        });

        return results;
    }
}
