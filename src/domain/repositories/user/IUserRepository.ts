import { User } from '../../entities/user/user';
import { AuthId } from '../../value-object/users/AuthId';
import { UserId } from '../../value-object/users/UserId';

export interface IUserRepository {
    save(user: User): Promise<void>;
    delete(user: User): Promise<void>;
    update(user: User): Promise<void>;
    findByAuthId(authId: AuthId): Promise<User | null>;
    findByUserId(userId: UserId): Promise<User | null>;
}
