import { Thread } from '../../entities/timeline/thread';

export interface IThreadRepository {
    save(thread: Thread): Promise<void>;
    findById(threadId: string): Promise<Thread | null>;
    findByOwnerUserId(ownerUserId: string, limit?: number, offset?: number): Promise<Thread[]>;
    findByParentThreadId(parentThreadId: string, limit?: number, offset?: number): Promise<Thread[]>;
    findRootThreads(limit?: number, offset?: number): Promise<Thread[]>;
    delete(threadId: string): Promise<void>;
    softDelete(threadId: string): Promise<void>;
    findBySelectDateRange(start: Date, end: Date, limit: number): Promise<Thread[]>;
}
