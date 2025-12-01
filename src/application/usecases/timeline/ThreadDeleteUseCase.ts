import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { IReactionRepository } from '../../../domain/repositories/timeline/IReactionRepository';
import { ThreadId } from '../../../domain/value-object/timeline/threadId';

export interface ThreadDeleteResult {
    success: boolean;
    deletedThreadIds: string[];
    deletedReactionIds: string[];
}

export class ThreadDeleteUseCase {
    constructor(
        private threadRepository: IThreadRepository,
        private reactionRepository: IReactionRepository
    ) {}

    /**
     * スレッドを削除（論理削除）
     * 子スレッドとリアクションも再帰的に削除
     */
    async execute(threadId: string, deleteChildren: boolean = true): Promise<ThreadDeleteResult> {
        const thread = await this.threadRepository.findById(threadId);
        
        if (!thread) {
            throw new Error(`Thread not found: ${threadId}`);
        }

        const deletedThreadIds: string[] = [];
        const deletedReactionIds: string[] = [];

        // 子スレッドを再帰的に削除
        if (deleteChildren) {
            const childThreadIds = thread.getChildThreadIds();
            for (const childThreadId of childThreadIds) {
                const childResult = await this.execute(childThreadId.getValue(), true);
                deletedThreadIds.push(...childResult.deletedThreadIds);
                deletedReactionIds.push(...childResult.deletedReactionIds);
            }
        }

        // このスレッドに紐づくリアクションを削除
        const reactions = await this.reactionRepository.findByParentId(threadId);
        for (const reaction of reactions) {
            await this.reactionRepository.delete(reaction.toPrimitives().id);
            deletedReactionIds.push(reaction.toPrimitives().id);
        }

        // 親スレッドから子スレッドの参照を削除
        const threadPrimitives = thread.toPrimitives();
        if (threadPrimitives.parentThreadId) {
            const parentThread = await this.threadRepository.findById(threadPrimitives.parentThreadId);
            if (parentThread) {
                const id = thread.toPrimitives().id;
                const updatedParent = parentThread.removeChildThread(ThreadId.fromExisting(id));
                await this.threadRepository.save(updatedParent);
            }
        }

        // スレッドを削除
        await this.threadRepository.delete(threadId);
        deletedThreadIds.push(threadId);

        return {
            success: true,
            deletedThreadIds,
            deletedReactionIds
        };
    }

    /**
     * スレッドを論理削除（deleatedAtを設定）
     */
    async executeSoftDelete(threadId: string): Promise<void> {
        const thread = await this.threadRepository.findById(threadId);
        
        if (!thread) {
            throw new Error(`Thread not found: ${threadId}`);
        }

        await this.threadRepository.softDelete(threadId);
    }
}