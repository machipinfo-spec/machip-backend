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
    ) {
        Object.freeze(this);
    }

    public static create(
        threadName: ThreadName,
        ownerUserId: UserId,
        parentThreadId?: ThreadId,
    ): Thread {
        return new Thread(
            ThreadId.create(),
            threadName,
            new Date(),
            null,
            ownerUserId,
            parentThreadId || null,
            [],
            null
        );
    }
    public static createFromMapPoint(
        threadName: ThreadName,
        ownerUserId: UserId,
        mapPointInfoId: PointInfoId,
    ): Thread {
        return new Thread(
            ThreadId.create(),
            threadName,
            new Date(),
            null,
            ownerUserId,
            null,
            [],
            mapPointInfoId
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
        mapPointInfoId: PointInfoId | null
    ): Thread {
        return new Thread(
            id,
            threadName,
            createdAt,
            deleatedAt,
            ownerUserId,
            parentThreadId,
            childThreadIds,
            mapPointInfoId
        );
    }

    public addChildThread(childThreadId: ThreadId): Thread {
        // 既に存在する場合は追加しない
        const exists = this.childThreadIds.some(
            id => id.getValue() === childThreadId.getValue()
        );
        
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
            this.mapPointInfoId
        );
    }

    public removeChildThread(childThreadId: ThreadId): Thread {
        const filteredChildren = this.childThreadIds.filter(
            id => id.getValue() !== childThreadId.getValue()
        );

        return new Thread(
            this.id,
            this.threadName,
            this.createdAt,
            this.deleatedAt,
            this.ownerUserId,
            this.parentThreadId,
            filteredChildren,
            this.mapPointInfoId
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

    public toPrimitives(): ThreadDTO {
        return {
            id: this.id.getValue(),
            threadName: this.threadName.getValue(),
            createdAt: this.createdAt,
            deleatedAt: this.deleatedAt,
            ownerUserId: this.ownerUserId.getValue(),
            parentThreadId: this.parentThreadId?.getValue() || null,
            childThreadIds: this.childThreadIds.map(id => id.getValue()),
            mapPointInfoId: this.mapPointInfoId ? this.mapPointInfoId.getValue() : null
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
}