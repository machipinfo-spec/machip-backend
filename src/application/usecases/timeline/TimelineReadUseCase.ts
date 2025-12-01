import { Thread } from '../../../domain/entities/timeline/thread';
import { Reaction } from '../../../domain/entities/timeline/reaction';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { IReactionRepository } from '../../../domain/repositories/timeline/IReactionRepository';

export interface TimelineThreadItem {
    thread: Thread;
    reactions: Reaction[];
    childThreadCount: number;
}

export interface TimelineReadResult {
    threads: TimelineThreadItem[];
    total: number;
}

export class TimelineReadUseCase {
    constructor(
        private threadRepository: IThreadRepository,
        private reactionRepository: IReactionRepository
    ) {}

    async execute(limit?: number): Promise<TimelineReadResult> {
        // トップレベル（ルート）スレッドを取得
        const rootThreads = await this.threadRepository.findRootThreads(limit);

        // 各スレッドのリアクションを並行取得
        const threadsWithDetails = await Promise.all(
            rootThreads.map(async (thread) => {
                const threadId = thread.toPrimitives().id;
                const childThreadIds = thread.toPrimitives().childThreadIds;

                // リアクションを取得
                const reactions = await this.reactionRepository.findByParentId(threadId);

                return {
                    thread,
                    reactions,
                    childThreadCount: childThreadIds.length
                };
            })
        );

        return {
            threads: threadsWithDetails,
            total: threadsWithDetails.length
        };
    }
}

export class TimelineReadByUserUseCase {
    constructor(
        private threadRepository: IThreadRepository,
        private reactionRepository: IReactionRepository
    ) {}

    async execute(ownerUserId: string, limit?: number): Promise<TimelineReadResult> {
        // 指定ユーザーのスレッドを取得
        const userThreads = await this.threadRepository.findByOwnerUserId(ownerUserId, limit);

        // トップレベルのスレッドのみをフィルタリング
        const rootThreads = userThreads.filter(thread => !thread.hasParent());

        // 各スレッドのリアクションを並行取得
        const threadsWithDetails = await Promise.all(
            rootThreads.map(async (thread) => {
                const threadId = thread.toPrimitives().id;
                const childThreadIds = thread.toPrimitives().childThreadIds;

                // リアクションを取得
                const reactions = await this.reactionRepository.findByParentId(threadId);

                return {
                    thread,
                    reactions,
                    childThreadCount: childThreadIds.length
                };
            })
        );

        return {
            threads: threadsWithDetails,
            total: threadsWithDetails.length
        };
    }
}