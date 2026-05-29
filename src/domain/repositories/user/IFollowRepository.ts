import { UserId } from '../../value-object/users/UserId';

export interface IFollowRepository {
    save(userId: UserId, targetUserId: UserId): Promise<void>;
    delete(userId: UserId, targetUserId: UserId): Promise<void>;
    findFollowingByUserId(userId: UserId): Promise<UserId[]>;
}
