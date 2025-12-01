import { PointInfoId } from '../../value-object/map/pointInfoId';
import { GeoLocation } from '../../value-object/map/geoLocation';
import { ThreadName } from '../../value-object/map/threadName';
import { Category } from '../../value-object/map/category';

export class PointInfo {
    private constructor(
        private readonly id: PointInfoId,
        private readonly geoLocation: GeoLocation,
        private readonly threadName: ThreadName,
        private readonly category: Category,
    ) {
        Object.freeze(this);
    }

    public static create(
        geoLocation: GeoLocation,
        threadName: ThreadName,
        category: Category
    ): PointInfo {
        return new PointInfo(
            PointInfoId.create(),
            geoLocation,
            threadName,
            category,
        );
    }

    public static fromExisting(
        id: PointInfoId,
        geoLocation: GeoLocation,
        threadName: ThreadName,
        category: Category,
        isRead: boolean
    ): PointInfo {
        return new PointInfo(id, geoLocation, threadName, category);
    }

    public getId(): PointInfoId {
        return this.id;
    }

    public getGeoLocation(): GeoLocation {
        return this.geoLocation;
    }

    public getThreadName(): ThreadName {
        return this.threadName;
    }

    public getCategory(): Category {
        return this.category;
    }

    public markAsRead(): PointInfo {
        return new PointInfo(
            this.id,
            this.geoLocation,
            this.threadName,
            this.category,
        );
    }

    public toPrimitives(): PointInfoDTO {
        return {
            id: this.id.getValue(),
            lat: this.geoLocation.getLat(),
            lng: this.geoLocation.getLng(),
            threadName: this.threadName.getValue(),
            category: this.category.getValue(),
        };
    }
}

export interface PointInfoDTO {
    lat: number;
    lng: number;
    id: string;
    threadName: string;
    category: string;
}