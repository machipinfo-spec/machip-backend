import { IBookmarkRepository } from '../../../domain/repositories/user/IBookmarkRepository';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
import { IPointEventRepository } from '../../../domain/repositories/map/IPointEventRepository';
import { UserId } from '../../../domain/value-object/users/UserId';
import { Profile } from '../../../domain/entities/profile/profile';
import {
    TimelineReadResult,
    TimelineThreadItem,
    TimelineThreadItemCommon
} from '../timeline/TimelineReadUseCase';

export class GetBookmarkedThreadsUseCase {
    constructor(
        private bookmarkRepository: IBookmarkRepository,
        private threadRepository: IThreadRepository,
        private profileRepository: IProfileRepository,
        private pointEventRepository: IPointEventRepository
    ) {}

    async execute(userId: string, limit?: number, offset?: number): Promise<TimelineReadResult> {
        // 1. Get bookmarked ThreadId objects
        const threadIds = await this.bookmarkRepository.findByUserId(
            UserId.fromExisting(userId),
            limit,
            offset
        );

        if (threadIds.length === 0) {
            return { threads: [], total: 0 };
        }

        // 2. Fetch Thread entities in parallel
        const fetchedThreads = await Promise.all(
            threadIds.map((id) => this.threadRepository.findById(id.getValue()))
        );
        const validThreads = fetchedThreads.filter((t): t is Exclude<typeof t, null> => t !== null);

        // 3. Resolve user profile and map point events to output objects
        const threads: TimelineThreadItem[] = await Promise.all(
            validThreads.map(async (thread) => {
                const primitives = thread.toPrimitives();

                let ownerUserProfile: Profile | null = null;
                try {
                    ownerUserProfile = await this.profileRepository.findByUserId(
                        UserId.fromExisting(primitives.ownerUserId)
                    );
                } catch (error) {
                    console.error(`Failed to fetch profile for user ${primitives.ownerUserId}:`, error);
                }

                const common: TimelineThreadItemCommon = {
                    threadId: primitives.id,
                    threadName: primitives.threadName,
                    createdAt: primitives.createdAt,
                    ownerUserId: primitives.ownerUserId,
                    ownerUserProfile: {
                        userId: ownerUserProfile?.userId.getValue() || null,
                        userName: ownerUserProfile?.userName.getValue() || '存在しないユーザー',
                        imageUrl:
                            ownerUserProfile?.imageUrl.getValue() || `${process.env.BLOB_BASE_URL}/profile/default.png`,
                    },
                    parentThreadId: primitives.parentThreadId,
                    childThreadIds: primitives.childThreadIds,
                    mapPointInfoId: primitives.mapPointInfoId,
                    childThreadCount: primitives.childThreadIds.length,
                    address: null,
                };

                if (primitives.mapPointInfoId) {
                    try {
                        const pointEvent = await this.pointEventRepository.findByPointInfoId(primitives.mapPointInfoId);
                        if (pointEvent) {
                            return {
                                ...common,
                                category: 'event',
                                categoryContent: {
                                    startDate: pointEvent.getStartDate(),
                                    endDate: pointEvent.getEndDate(),
                                    detail: pointEvent.getDetail(),
                                    url: pointEvent.getUrl(),
                                    imageUrl: pointEvent.getImageUrl(),
                                },
                            };
                        }
                    } catch (e) {
                        console.warn(`Failed to fetch point event for ${primitives.mapPointInfoId}`, e);
                    }
                }

                return {
                    ...common,
                    category: primitives.category || 'chat',
                    categoryContent: {
                        imageUrl: primitives.imageUrl,
                        detail: primitives.detail,
                        url: primitives.url,
                    },
                };
            })
        );

        return {
            threads,
            total: threads.length,
        };
    }
}
