import { PointEventId } from '../../value-object/map/pointEventId';
import { PointInfoId } from '../../value-object/map/pointInfoId';
import { ThreadName } from '../../value-object/map/threadName'; // Import ThreadName

export class PointEvent {
    private constructor(
        private readonly id: PointEventId,
        private readonly pointInfoId: PointInfoId,
        private readonly threadName: ThreadName, // New
        private readonly imageUrl: string | null, // New
        private readonly createdAt: Date, // New
        private readonly startDate: Date,
        private readonly endDate: Date,
        private readonly detail: string | null,
        private readonly url: string | null,
        private readonly deletedAt: Date | null, // New
    ) {
        Object.freeze(this);
    }

    public static create(
        pointInfoId: PointInfoId,
        threadName: ThreadName, // New
        imageUrl: string | null, // New
        startDate: Date,
        endDate: Date,
        detail: string | null,
        url: string | null,
        pointEventId?: PointEventId,
    ): PointEvent {
        return new PointEvent(
            pointEventId || PointEventId.create(),
            pointInfoId,
            threadName,
            imageUrl,
            new Date(), // createdAt
            startDate,
            endDate,
            detail,
            url,
            null, // deletedAt
        );
    }

    public static fromExisting(
        id: PointEventId,
        pointInfoId: PointInfoId,
        threadName: ThreadName, // New
        imageUrl: string | null, // New
        createdAt: Date, // New
        startDate: Date,
        endDate: Date,
        detail: string | null,
        url: string | null,
        deletedAt: Date | null, // New
    ): PointEvent {
        return new PointEvent(
            id,
            pointInfoId,
            threadName,
            imageUrl,
            createdAt,
            startDate,
            endDate,
            detail,
            url,
            deletedAt,
        );
    }

    public getId(): PointEventId {
        return this.id;
    }

    public getPointInfoId(): PointInfoId {
        return this.pointInfoId;
    }

    public getThreadName(): ThreadName {
        return this.threadName;
    }

    public getImageUrl(): string | null {
        return this.imageUrl;
    }

    public getCreatedAt(): Date {
        return this.createdAt;
    }

    public getStartDate(): Date {
        return this.startDate;
    }

    public getEndDate(): Date {
        return this.endDate;
    }

    public getDetail(): string | null {
        return this.detail;
    }

    public getUrl(): string | null {
        return this.url;
    }

    public getDeletedAt(): Date | null {
        return this.deletedAt;
    }

    public toPrimitives(): PointEventDTO {
        return {
            id: this.id.getValue(),
            pointInfoId: this.pointInfoId.getValue(),
            threadName: this.threadName.getValue(),
            imageUrl: this.imageUrl,
            createdAt: this.createdAt,
            startDate: this.startDate,
            endDate: this.endDate,
            detail: this.detail,
            url: this.url,
            deletedAt: this.deletedAt,
        };
    }
}

export interface PointEventDTO {
    id: string;
    pointInfoId: string;
    threadName: string;
    imageUrl: string | null;
    createdAt: Date;
    startDate: Date;
    endDate: Date;
    detail: string | null;
    url: string | null;
    deletedAt: Date | null;
}
