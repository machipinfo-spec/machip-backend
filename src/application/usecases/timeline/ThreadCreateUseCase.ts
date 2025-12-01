import { Thread } from '../../../domain/entities/timeline/thread';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { ThreadName } from '../../../domain/value-object/map/threadName';
import { UserId } from '../../../domain/value-object/users/UserId';
import { ThreadId } from '../../../domain/value-object/timeline/threadId';
import { PointInfoId } from '../../../domain/value-object/map/pointInfoId';

export class ThreadCreateUseCase {
    constructor(private threadRepository: IThreadRepository) {}

    async execute(
        threadName: string,
        ownerUserId: string,
        parentThreadId?: string,
        pointInfoId?: string
    ): Promise<Thread> {
        const parentThread = parentThreadId 
            ? ThreadId.fromExisting(parentThreadId)
            : undefined;

        let thread;
        if(!pointInfoId){
            thread = Thread.create(
                ThreadName.create(threadName),
                UserId.fromExisting(ownerUserId),
                parentThread
            );
        }else{
            thread = Thread.createFromMapPoint(
                ThreadName.create(threadName),
                UserId.fromExisting(ownerUserId),
                PointInfoId.fromExisting(pointInfoId)
            );

        }

        await this.threadRepository.save(thread);

        // 親スレッドが存在する場合、親スレッドの子リストに追加
        if (parentThreadId) {
            const parent = await this.threadRepository.findById(parentThreadId);
            if (parent) {
                const threadId = ThreadId.fromExisting(thread.toPrimitives().id);
                const updatedParent = parent.addChildThread(threadId);
                await this.threadRepository.save(updatedParent);
            }
        }

        return thread;
    }
}