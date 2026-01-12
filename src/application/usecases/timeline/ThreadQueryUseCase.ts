import { Thread } from '../../../domain/entities/timeline/thread';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { UserId } from '../../../domain/value-object/users/UserId';
import { Profile } from '../../../domain/entities/profile/profile';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository'; // Removed .ts extension
import { IPointEventRepository } from '../../../domain/repositories/map/IPointEventRepository';

export interface ThreadItemCommon {
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
    childThreadCount: number;
}

export interface EventContent {
    startDate: Date;
    endDate: Date;
    detail: string | null;
    url: string | null;
    imageUrl: string | null;
}

export interface ChatContent {
    imageUrl: string | null;
}

export interface ThreadItemEvent extends ThreadItemCommon {
    category: 'event';
    categoryContent: EventContent;
}

export interface ThreadItemChat extends ThreadItemCommon {
    category: 'chat';
    categoryContent: ChatContent;
}

export type ThreadItem = ThreadItemEvent | ThreadItemChat;

export interface ThreadQueryResult {
    threads: ThreadItem[];
}

export class ThreadQueryUseCase {
    constructor(
        private threadRepository: IThreadRepository,
        private profileRepository: IProfileRepository,
        private pointEventRepository: IPointEventRepository,
    ) {}

    private async convertToThreadItem(
        thread: Thread,
        preFetchedEvent?: import('../../../domain/entities/map/PointEvent').PointEvent,
    ): Promise<ThreadItem> {
        const p = thread.toPrimitives();

        let ownerUserProfile: Profile | null = null;
        try {
            ownerUserProfile = await this.profileRepository.findByUserId(UserId.fromExisting(p.ownerUserId));
        } catch (e) {
            console.error(`Failed to fetch profile for user ${p.ownerUserId}`, e);
        }

        const common: ThreadItemCommon = {
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
            childThreadCount: p.childThreadIds.length,
        };

        if (preFetchedEvent) {
            return {
                ...common,
                category: 'event',
                categoryContent: {
                    startDate: preFetchedEvent.getStartDate(),
                    endDate: preFetchedEvent.getEndDate(),
                    detail: preFetchedEvent.getDetail(),
                    url: preFetchedEvent.getUrl(),
                    imageUrl: preFetchedEvent.getImageUrl(),
                },
            };
        } else if (p.mapPointInfoId) {
            try {
                const pointEvent = await this.pointEventRepository.findByPointInfoId(p.mapPointInfoId);
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
                console.warn(`Failed to fetch point event for ${p.mapPointInfoId}`, e);
            }
        }

        return {
            ...common,
            category: 'chat',
            categoryContent: {
                imageUrl: p.imageUrl,
            },
        };
    }

    async execute(start: Date, end: Date, limit = 100): Promise<ThreadQueryResult> {
        // 1. PointEvent を日付範囲で検索 (startDateが範囲内のもの)
        const events = await this.pointEventRepository.findByDateRange(start, end, limit);

        if (events.length === 0) {
            return { threads: [] };
        }

        // 2. 対応する PointInfoId のリストを作成
        const pointInfoIds = events.map((e) => e.getPointInfoId().getValue());
        // 重複排除 (念のため)
        const uniquePointInfoIds = [...new Set(pointInfoIds)];

        // 3. Thread を mapPointInfoId で検索
        const threads = await this.threadRepository.findByMapPointInfoIds(uniquePointInfoIds);

        // 4. PointEvent と Thread を紐付け (Map作成)
        const eventMap = new Map<string, import('../../../domain/entities/map/PointEvent').PointEvent>();
        events.forEach((e) => {
            eventMap.set(e.getPointInfoId().getValue(), e);
        });

        // 5. ThreadItem に変換 (preFetchedEvent を使用)
        const threadItems: ThreadItem[] = await Promise.all(
            threads.map(async (t) => {
                const p = t.toPrimitives();
                const event = p.mapPointInfoId ? eventMap.get(p.mapPointInfoId) : undefined;
                return await this.convertToThreadItem(t, event);
            }),
        );

        // 日付順にソート (ThreadResultの要件によるが、PointEventでソートされていてもThread取得順序が保証されないため)
        // threadItems.sort((a, b) => ...); // 必要であれば実装

        return {
            threads: threadItems,
        };
    }
}
