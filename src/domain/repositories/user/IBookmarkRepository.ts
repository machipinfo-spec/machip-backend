import { UserId } from '../../value-object/users/UserId';
import { ThreadId } from '../../value-object/timeline/threadId';

export interface IBookmarkRepository {
    save(userId: UserId, threadId: ThreadId): Promise<void>;
    delete(userId: UserId, threadId: ThreadId): Promise<void>;
    findByUserId(userId: UserId, limit?: number, offset?: number): Promise<ThreadId[]>;
}
