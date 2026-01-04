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
}
