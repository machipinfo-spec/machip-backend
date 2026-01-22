import { getDbAndAuth } from '../../config/firebaseAdmin';
import { IDeviceTokenRepository } from '../../../../domain/repositories/user/IDeviceTokenRepository';
import { DeviceToken } from '../../../../domain/entities/user/DeviceToken';

export class DeviceTokenRepository implements IDeviceTokenRepository {
    private readonly collectionName = 'device_tokens';

    async save(deviceToken: DeviceToken): Promise<void> {
        const { db } = await getDbAndAuth();
        const data = {
            token: deviceToken.getToken(),
            userId: deviceToken.getUserId(),
            platform: deviceToken.getPlatform(),
            createdAt: deviceToken.getCreatedAt(),
            lastUsedAt: deviceToken.getLastUsedAt(),
        };

        await db.collection(this.collectionName).doc(deviceToken.getToken()).set(data);
    }

    async delete(token: string): Promise<void> {
        const { db } = await getDbAndAuth();
        await db.collection(this.collectionName).doc(token).delete();
    }

    async findByToken(token: string): Promise<DeviceToken | null> {
        const { db } = await getDbAndAuth();
        const doc = await db.collection(this.collectionName).doc(token).get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data();
        if (!data) return null;

        return this.mapToEntity(data);
    }

    async findByUserId(userId: string): Promise<DeviceToken[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db.collection(this.collectionName).where('userId', '==', userId).get();

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map((doc) => this.mapToEntity(doc.data()));
    }

    async deleteTokens(tokens: string[]): Promise<void> {
        if (tokens.length === 0) return;

        const { db } = await getDbAndAuth();
        const batch = db.batch();

        tokens.forEach((token) => {
            const ref = db.collection(this.collectionName).doc(token);
            batch.delete(ref);
        });

        await batch.commit();
    }

    private mapToEntity(data: any): DeviceToken {
        return DeviceToken.reconstruct(
            data.token,
            data.userId,
            data.platform,
            data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt,
            data.lastUsedAt.toDate ? data.lastUsedAt.toDate() : data.lastUsedAt,
        );
    }
}
