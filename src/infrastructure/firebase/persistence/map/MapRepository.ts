import { getDbAndAuth } from '../../config/firebaseAdmin';
import { PointInfo, PointInfoDTO } from '../../../../domain/entities/map/pointInfo';
import { PointInfoId } from '../../../../domain/value-object/map/pointInfoId';
import { GeoLocation } from '../../../../domain/value-object/map/geoLocation';
import { Category } from '../../../../domain/value-object/map/category';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { IMapRepository } from '../../../../domain/repositories/map/IMapRepository';

export class MapRepository implements IMapRepository {
    private readonly tableName = 'points';

    async save(pointInfo: PointInfo): Promise<void> {
        const dto: PointInfoDTO = pointInfo.toPrimitives();
        const record = {
            id: dto.id,
            lat: dto.lat,
            lng: dto.lng,
            category: dto.category,
            address: dto.address || null,
            deletedAt: dto.deletedAt || null,
            ownerUserId: dto.ownerUserId,
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
        if (data.deletedAt) return null;

        return this.mapToPointInfo(docRef.id, data);
    }

    async findByThreadName(threadName: string, limit = 50): Promise<PointInfo[]> {
        // PointInfo has no threadName anymore
        // This query might need to be deprecated or implemented via join (which is hard in NoSQL)
        // or by querying PointEvents then fetching PointInfos?
        // But for now, we leave it empty or throwing error?
        // The interface still has it potentially? Checking IMapRepository next.
        // Assuming we should maybe remove this method from interface or implement differently?
        // If PointInfo table doesn't have threadName, this is impossible directly.
        // Returning empty list for now until Interface is updated or this is resolved.
        return [];
    }

    async findByCategory(category: string, limit = 50): Promise<PointInfo[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('category', '==', category)
            .where('deletedAt', '==', null)
            .limit(limit)
            .get();

        return this.mapDocsToPointInfos(snapshot);
    }

    async findAll(limit = 50): Promise<PointInfo[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db.collection(this.tableName).where('deletedAt', '==', null).limit(limit).get();

        return this.mapDocsToPointInfos(snapshot);
    }

    private mapToPointInfo(docId: string, data: any): PointInfo {
        return PointInfo.fromExisting(
            PointInfoId.fromExisting(docId),
            GeoLocation.fromCoordinates(data.lat, data.lng),
            Category.create(data.category),
            data.address || null,
            data.deletedAt ? (data.deletedAt.toDate ? data.deletedAt.toDate() : data.deletedAt) : null,
            UserId.fromExisting(data.ownerUserId),
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
    async softDelete(pointInfoId: string): Promise<void> {
        const { db } = await getDbAndAuth();
        const docRef = await db.collection(this.tableName).doc(pointInfoId).get();

        if (!docRef.exists) return;
        const data = docRef.data();
        if (!data) return;
        if (data.deletedAt) return;

        data.deletedAt = new Date();
        await db.collection(this.tableName).doc(pointInfoId).set(data);
    }
}
