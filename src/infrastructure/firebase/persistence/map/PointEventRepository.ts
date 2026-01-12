import { getDbAndAuth } from '../../config/firebaseAdmin';
import { IPointEventRepository } from '../../../../domain/repositories/map/IPointEventRepository';
import { PointEvent, PointEventDTO } from '../../../../domain/entities/map/PointEvent';
import { PointEventId } from '../../../../domain/value-object/map/pointEventId';
import { PointInfoId } from '../../../../domain/value-object/map/pointInfoId';
import { ThreadName } from '../../../../domain/value-object/map/threadName';

export class PointEventRepository implements IPointEventRepository {
    private readonly tableName = 'point_events';

    async save(pointEvent: PointEvent): Promise<void> {
        const dto: PointEventDTO = pointEvent.toPrimitives();
        const record = {
            id: dto.id,
            pointInfoId: dto.pointInfoId,
            threadName: dto.threadName,
            imageUrl: dto.imageUrl || null,
            createdAt: dto.createdAt,
            startDate: dto.startDate,
            endDate: dto.endDate,
            detail: dto.detail || null,
            url: dto.url || null,
            deletedAt: dto.deletedAt || null,
        };

        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(dto.id).set(record);
    }

    async findByPointInfoId(pointInfoId: string): Promise<PointEvent | null> {
        const { db } = await getDbAndAuth();
        const snapshot = await db.collection(this.tableName).where('pointInfoId', '==', pointInfoId).limit(1).get();

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        const data = doc.data();

        return this.mapToPointEvent(doc.id, data);
    }

    private mapToPointEvent(docId: string, data: any): PointEvent {
        return PointEvent.fromExisting(
            PointEventId.fromExisting(docId),
            PointInfoId.fromExisting(data.pointInfoId),
            ThreadName.create(data.threadName),
            data.imageUrl || null,
            data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : new Date(),
            data.startDate.toDate ? data.startDate.toDate() : data.startDate,
            data.endDate.toDate ? data.endDate.toDate() : data.endDate,
            data.detail || null,
            data.url || null,
            data.deletedAt ? (data.deletedAt.toDate ? data.deletedAt.toDate() : data.deletedAt) : null,
        );
    }

    async findByThreadName(threadName: string): Promise<PointEvent[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('threadName', '==', threadName)
            .where('deletedAt', '==', null)
            .get();

        if (snapshot.empty) return [];
        return snapshot.docs.map((doc) => this.mapToPointEvent(doc.id, doc.data()));
    }

    async findByDateRange(start: Date, end: Date, limit: number): Promise<PointEvent[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('startDate', '>=', start)
            .where('startDate', '<=', end)
            .orderBy('startDate', 'asc')
            .limit(limit)
            .get();

        if (snapshot.empty) return [];
        return snapshot.docs.map((doc) => this.mapToPointEvent(doc.id, doc.data()));
    }
}
