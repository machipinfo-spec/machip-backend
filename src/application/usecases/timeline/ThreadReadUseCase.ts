import { Thread } from '../../../domain/entities/timeline/thread';
import { Reaction } from '../../../domain/entities/timeline/reaction';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { IReactionRepository } from '../../../domain/repositories/timeline/IReactionRepository';

export interface ThreadReadResult {
    thread: Thread;
    reactions: Reaction[];
    childThreads: ThreadReadResult[];
    parentThread: Thread | null;
}

export class ThreadReadUseCase {
    constructor(
        private threadRepository: IThreadRepository,
        private reactionRepository: IReactionRepository
    ) {}

    async execute(threadId: string, includeChildren: boolean = true): Promise<ThreadReadResult | null> {
        const thread = await this.threadRepository.findById(threadId);
        if (!thread) {
            return null;
        }

        const threadPrimitives = thread.toPrimitives();

        // スレッドに紐づくデータを並行取得
        const [reactions, childThreads, parentThread] = await Promise.all([
            this.reactionRepository.findByParentId(threadId),
            includeChildren 
                ? this.threadRepository.findByParentThreadId(threadId)
                : Promise.resolve([]),
            threadPrimitives.parentThreadId 
                ? this.threadRepository.findById(threadPrimitives.parentThreadId)
                : Promise.resolve(null)
        ]);

        // 子スレッドを再帰的に取得
        const childThreadResults = includeChildren
            ? await Promise.all(
                childThreads.map(childThread => 
                    this.execute(childThread.toPrimitives().id, true)
                )
            )
            : [];

        return {
            thread,
            reactions,
            childThreads: childThreadResults.filter((result): result is ThreadReadResult => result !== null),
            parentThread
        };
    }

    async executeFlat(threadId: string): Promise<ThreadReadResult | null> {
        const thread = await this.threadRepository.findById(threadId);
        if (!thread) {
            return null;
        }

        const threadPrimitives = thread.toPrimitives();

        // 子スレッドは取得するが、再帰はしない（1階層のみ）
        const [reactions, childThreads, parentThread] = await Promise.all([
            this.reactionRepository.findByParentId(threadId),
            this.threadRepository.findByParentThreadId(threadId),
            threadPrimitives.parentThreadId 
                ? this.threadRepository.findById(threadPrimitives.parentThreadId)
                : Promise.resolve(null)
        ]);

        // 子スレッドは Thread エンティティのみを取得
        const childThreadResults = await Promise.all(
            childThreads.map(async (childThread) => {
                const childId = childThread.toPrimitives().id;
                const childReactions = await this.reactionRepository.findByParentId(childId);
                
                return {
                    thread: childThread,
                    reactions: childReactions,
                    childThreads: [],
                    parentThread: thread
                };
            })
        );

        return {
            thread,
            reactions,
            childThreads: childThreadResults,
            parentThread
        };
    }
}

export class ThreadReadByOwnerUseCase {
    constructor(private threadRepository: IThreadRepository) {}

    async execute(ownerUserId: string, limit?: number): Promise<Thread[]> {
        return await this.threadRepository.findByOwnerUserId(ownerUserId, limit);
    }
}

export class ThreadReadRootUseCase {
    constructor(private threadRepository: IThreadRepository) {}

    async execute(limit?: number): Promise<Thread[]> {
        return await this.threadRepository.findRootThreads(limit);
    }
}

export class ThreadReadChildrenUseCase {
    constructor(private threadRepository: IThreadRepository) {}

    async execute(parentThreadId: string, limit?: number): Promise<Thread[]> {
        return await this.threadRepository.findByParentThreadId(parentThreadId, limit);
    }
}