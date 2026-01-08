import { PointInfoId } from '../../value-object/map/pointInfoId';
import { ThreadName } from '../../value-object/map/threadName';
import { ThreadId } from '../../value-object/timeline/threadId';
import { UserId } from '../../value-object/users/UserId';

export class Thread {
    private constructor(
        private readonly id: ThreadId,
        private readonly threadName: ThreadName,
        private readonly createdAt: Date,
        private readonly deleatedAt: Date | null,
        private readonly ownerUserId: UserId,
        private readonly parentThreadId: ThreadId | null,
        private readonly childThreadIds: ThreadId[],
        private readonly mapPointInfoId: PointInfoId | null,
        private readonly imageUrl: string | null,
        private readonly selectDate: Date | null,
        private readonly address: string | null,
    ) {
        Object.freeze(this);
    }

    public static create(
        threadName: ThreadName,
        ownerUserId: UserId,
        selectDate: Date | null,
        address: string | null,
        imageUrl: string | null,
        parentThreadId: ThreadId | null,
        threadId: ThreadId | null,
    ): Thread {
        return new Thread(
            threadId || ThreadId.create(),
            threadName,
            new Date(),
            null,
            ownerUserId,
            parentThreadId,
            [],
            null,
            imageUrl,
            selectDate,
            address,
        );
    }

    public static createFromMapPoint(
        threadName: ThreadName,
        ownerUserId: UserId,
        mapPointInfoId: PointInfoId,
        selectDate: Date | null,
        address: string | null,
        imageUrl: string | null,
        threadId: ThreadId | null,
    ): Thread {
        return new Thread(
            threadId || ThreadId.create(),
            threadName,
            new Date(),
            null,
            ownerUserId,
            null,
            [],
            mapPointInfoId,
            imageUrl,
            selectDate,
            address,
        );
    }

    public static fromExisting(
        id: ThreadId,
        threadName: ThreadName,
        createdAt: Date,
        deleatedAt: Date | null,
        ownerUserId: UserId,
        parentThreadId: ThreadId | null,
        childThreadIds: ThreadId[],
        mapPointInfoId: PointInfoId | null,
        imageUrl: string | null = null,
        selectDate: Date | null,
        address: string | null,
    ): Thread {
        return new Thread(
            id,
            threadName,
            createdAt,
            deleatedAt,
            ownerUserId,
            parentThreadId,
            childThreadIds,
            mapPointInfoId,
            imageUrl,
            selectDate,
            address,
        );
    }

    public addChildThread(childThreadId: ThreadId): Thread {
        // 既に存在する場合は追加しない
        const exists = this.childThreadIds.some((id) => id.getValue() === childThreadId.getValue());
        if (exists) {
            return this;
        }

        return new Thread(
            this.id,
            this.threadName,
            this.createdAt,
            this.deleatedAt,
            this.ownerUserId,
            this.parentThreadId,
            [...this.childThreadIds, childThreadId],
            this.mapPointInfoId,
            this.imageUrl,
            this.selectDate,
            this.address,
        );
    }

    public removeChildThread(childThreadId: ThreadId): Thread {
        const filteredChildren = this.childThreadIds.filter((id) => id.getValue() !== childThreadId.getValue());

        return new Thread(
            this.id,
            this.threadName,
            this.createdAt,
            this.deleatedAt,
            this.ownerUserId,
            this.parentThreadId,
            filteredChildren,
            this.mapPointInfoId,
            this.imageUrl,
            this.selectDate,
            this.address,
        );
    }

    public hasParent(): boolean {
        return this.parentThreadId !== null;
    }

    public hasChildren(): boolean {
        return this.childThreadIds.length > 0;
    }

    public getParentThreadId(): ThreadId | null {
        return this.parentThreadId;
    }

    public getChildThreadIds(): ThreadId[] {
        return [...this.childThreadIds];
    }

    public getImageUrl(): string | null {
        return this.imageUrl;
    }

    public getOwnerUserId(): UserId {
        return this.ownerUserId;
    }

    public toPrimitives(): ThreadDTO {
        return {
            id: this.id.getValue(),
            threadName: this.threadName.getValue(),
            createdAt: this.createdAt,
            deleatedAt: this.deleatedAt,
            ownerUserId: this.ownerUserId.getValue(),
            parentThreadId: this.parentThreadId?.getValue() || null,
            childThreadIds: this.childThreadIds.map((id) => id.getValue()),
            mapPointInfoId: this.mapPointInfoId ? this.mapPointInfoId.getValue() : null,
            imageUrl: this.imageUrl,
            selectDate: this.selectDate,
            address: this.address,
        };
    }
}

export interface ThreadDTO {
    id: string;
    threadName: string;
    createdAt: Date;
    deleatedAt: Date | null;
    ownerUserId: string;
    parentThreadId: string | null;
    childThreadIds: string[];
    mapPointInfoId: string | null;
    imageUrl: string | null;
    selectDate: Date | null;
    address: string | null;
}
