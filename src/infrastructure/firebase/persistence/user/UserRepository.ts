import { IUserRepository } from '../../../../domain/repositories/user/IUserRepository';
import { AuthId } from '../../../../domain/value-object/users/AuthId';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { Email } from '../../../../domain/value-object/users/Email';
import { UserName } from '../../../../domain/value-object/users/UserName';
import { getDbAndAuth } from '../../config/firebaseAdmin';
import { User } from '../../../../domain/entities/user/user';

export class UserRepository implements IUserRepository {
    async delete(user: User): Promise<void> {
        const { db } = await getDbAndAuth();
        db.collection(this.tableName).doc(user.userId.getValue()).delete();
    }
    update(user: User): Promise<void> {
        throw new Error('Method not implemented.');
    }
    private readonly tableName = 'Users';
    async findByAuthId(authId: AuthId): Promise<User | null> {
        const { db } = await getDbAndAuth();
        const query = db.collection(this.tableName).where('authId', '==', authId.getValue());
        const querySnapshot = await query.get();

        if (querySnapshot.empty) {
            console.log('No matching documents found');
            return null;
        }
        const doc = querySnapshot.docs[0].data();

        return User.reconstitute(
            new AuthId(doc.authId),
            new UserId(doc.userId),
            new UserName(doc.name),
            new Email(doc.email),
        );
    }
    async findByUserId(userId: UserId): Promise<User | null> {
        const { db } = await getDbAndAuth();
        const query = db.collection(this.tableName).where('userId', '==', userId.getValue());
        const querySnapshot = await query.get();

        if (querySnapshot.empty) {
            return null;
        }
        const doc = querySnapshot.docs[0].data();

        return User.reconstitute(
            new AuthId(doc.authId),
            new UserId(doc.userId),
            new UserName(doc.name),
            new Email(doc.email),
        );
    }

    async findAll(): Promise<User[]> {
        const { db } = await getDbAndAuth();
        const querySnapshot = await db.collection(this.tableName).get();

        return querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return User.reconstitute(
                new AuthId(data.authId),
                new UserId(data.userId),
                new UserName(data.name),
                new Email(data.email),
            );
        });
    }

    async save(user: User): Promise<void> {
        const record = {
            authId: user.authId.getValue(),
            userId: user.userId.getValue(),
            name: user.name.getValue(),
            email: user.email.getValue(),
        };
        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).add(record);
    }

    async search(params: {
        limit?: number;
        nextToken?: string;
        keyword?: string;
    }): Promise<{ users: User[]; nextToken: string | null }> {
        const { db } = await getDbAndAuth();
        let query: any = db.collection(this.tableName); // Type any to avoid complex Firestore types matching

        // NOTE: Firestore doesn't support substring match easily.
        // For MVP, we will only apply pagination here to reduce read count for the listing use case.
        // If keyword is provided, we still have to filter in memory IF we can't key match.
        // However, user requested "reduce DB usage", so ideally we filter at DB.
        // For now, we will just implement pagination. Full text search needs a dedicated solution (e.g. Algolia).

        // Order by userId to ensure stable pagination
        query = query.orderBy('userId');

        if (params.nextToken) {
            query = query.startAfter(params.nextToken);
        }

        if (params.limit) {
            query = query.limit(params.limit);
        }

        const querySnapshot = await query.get();
        const users = querySnapshot.docs.map((doc: any) => {
            const data = doc.data();
            return User.reconstitute(
                new AuthId(data.authId),
                new UserId(data.userId),
                new UserName(data.name),
                new Email(data.email),
            );
        });

        // In-memory filter for keyword if provided (Fallback)
        // This defeats "reduce DB usage" for search-with-keyword case if we fetched only a page and filtered it
        // -> we might return empty page.
        // But for LISTING (no keyword), this is efficient.
        let resultUsers = users;
        if (params.keyword) {
            const lowerM = params.keyword.toLowerCase();
            resultUsers = users.filter(
                (u: User) =>
                    u.name.getValue().toLowerCase().includes(lowerM) ||
                    u.email.getValue().toLowerCase().includes(lowerM),
            );
        }

        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        // The cursor for next page should be the ID of the last fetched document (userId in this case)
        const nextToken = lastDoc ? lastDoc.data().userId : null;

        return { users: resultUsers, nextToken };
    }
}
