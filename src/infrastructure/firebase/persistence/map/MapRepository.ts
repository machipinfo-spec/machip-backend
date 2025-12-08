import { getDbAndAuth } from '../../config/firebaseAdmin';
import { PointInfo, PointInfoDTO } from '../../../../domain/entities/map/pointInfo';
import { PointInfoId } from '../../../../domain/value-object/map/pointInfoId';
import { GeoLocation } from '../../../../domain/value-object/map/geoLocation';
import { ThreadName } from '../../../../domain/value-object/map/threadName';
import { Category } from '../../../../domain/value-object/map/category';
import { IMapRepository } from '../../../../domain/repositories/map/IMapRepository';

export class MapRepository implements IMapRepository {
    private readonly tableName = 'points';

    async save(pointInfo: PointInfo): Promise<void> {
        const dto: PointInfoDTO = pointInfo.toPrimitives();
        const record = {
            id: dto.id,
            lat: dto.lat,
            lng: dto.lng,
            threadName: dto.threadName,
            category: dto.category,
            selectDate: dto.selectDate,
            imageUrl: dto.imageUrl || null
        };

        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(dto.id).set(record);
    }

    async findById(pointInfoId: string): Promise<PointInfo | null> {
        const { db } = await getDbAndAuth();
        const docRef = await db.collection(this.tableName).doc(pointInfoId).get();

        if (!docRef.exists) return null;
        const data = docRef.data();
        if (!data) return null;

        return this.mapToPointInfo(docRef.id, data);
    }

    async findByThreadName(threadName: string, limit = 50): Promise<PointInfo[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('threadName', '==', threadName)
            .limit(limit)
            .get();

        return this.mapDocsToPointInfos(snapshot);
    }

    async findByCategory(category: string, limit = 50): Promise<PointInfo[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('category', '==', category)
            .limit(limit)
            .get();

        return this.mapDocsToPointInfos(snapshot);
    }

    async findAll(limit = 50): Promise<PointInfo[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .limit(limit)
            .get();

        return this.mapDocsToPointInfos(snapshot);
    }

    private mapToPointInfo(docId: string, data: any): PointInfo {
        return PointInfo.fromExisting(
            PointInfoId.fromExisting(docId),
            GeoLocation.fromCoordinates(data.lat, data.lng),
            ThreadName.create(data.threadName),
            Category.create(data.category),
            data.isRead || false,
            data.imageUrl || null,
            data.selectDate ? new Date(data.selectDate) : null,
        );
    }

    private mapDocsToPointInfos(snapshot: any): PointInfo[] {
        const results: PointInfo[] = [];
        snapshot.forEach((doc: any) => {
            const data = doc.data();
            if (!data) return;
            results.push(this.mapToPointInfo(doc.id, data));
        });
        return results;
    }
}