import { Thread } from '../../../domain/entities/timeline/thread';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { UserId } from '../../../domain/value-object/users/UserId';
import { Profile } from '../../../domain/entities/profile/profile';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository.ts';

export interface ThreadItem {
    threadId: string;
    threadName: string;
    createdAt: Date;
    ownerUserId: string;
    ownerUserProfile: {
        userId: string | null;
        userName: string | null;
        imageUrl: string | null;
    };
    parentThreadId: string | null;
    childThreadIds: string[];
    mapPointInfoId: string | null;
    imageUrl: string | null;
    selectDate: Date | null;
    childThreadCount: number;
    address: string | null;
}

export interface ThreadQueryResult {
    threads: ThreadItem[];
}

export class ThreadQueryUseCase {
    constructor(private threadRepository: IThreadRepository, private profileRepository: IProfileRepository) {}

    private async convertToThreadItem(thread: Thread): Promise<ThreadItem> {
        const p = thread.toPrimitives();

        let ownerUserProfile: Profile | null = null;
        try {
            ownerUserProfile = await this.profileRepository.findByUserId(UserId.fromExisting(p.ownerUserId));
        } catch (e) {
            console.error(`Failed to fetch profile for user ${p.ownerUserId}`, e);
        }

        return {
            threadId: p.id,
            threadName: p.threadName,
            createdAt: p.createdAt,
            ownerUserId: p.ownerUserId,
            ownerUserProfile: {
                userId: ownerUserProfile?.userId.getValue() || null,
                userName: ownerUserProfile?.userName.getValue() || '存在しないユーザー',
                imageUrl: ownerUserProfile?.imageUrl.getValue() || `${process.env.BLOB_BASE_URL}/profile/default.png`,
            },
            parentThreadId: p.parentThreadId,
            childThreadIds: p.childThreadIds,
            mapPointInfoId: p.mapPointInfoId,
            imageUrl: p.imageUrl,
            selectDate: p.selectDate,
            childThreadCount: p.childThreadIds.length,
            address: p.address,
        };
    }

    async execute(start: Date, end: Date, limit = 100): Promise<ThreadQueryResult> {
        // 範囲クエリで thread を取得
        const threads = await this.threadRepository.findBySelectDateRange(start, end, limit);

        // mapToThreadItem の並列処理
        const threadItems: ThreadItem[] = await Promise.all(
            threads.map(async (t) => await this.convertToThreadItem(t)),
        );

        return {
            threads: threadItems,
        };
    }
}
