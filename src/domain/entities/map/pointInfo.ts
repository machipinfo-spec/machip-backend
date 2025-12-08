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
        private readonly imageUrl: string | null,
        private readonly selectDate: Date | null,

    ) {
        Object.freeze(this);
    }

    public static create(
        geoLocation: GeoLocation,
        threadName: ThreadName,
        category: Category,
        imageUrl: string | null,
        selectDate: Date | null,
        pointInfoId?: PointInfoId,
    ): PointInfo {
        return new PointInfo(
            pointInfoId || PointInfoId.create(),
            geoLocation,
            threadName,
            category,
            imageUrl,
            selectDate
        );
    }

    public static fromExisting(
        id: PointInfoId,
        geoLocation: GeoLocation,
        threadName: ThreadName,
        category: Category,
        isRead: boolean,
        imageUrl: string | null,
        selectDate: Date | null,
    ): PointInfo {
        return new PointInfo(id, geoLocation, threadName, category, imageUrl, selectDate);
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
            this.imageUrl,
            this.selectDate
        );
    }

    public toPrimitives(): PointInfoDTO {
        return {
            id: this.id.getValue(),
            lat: this.geoLocation.getLat(),
            lng: this.geoLocation.getLng(),
            threadName: this.threadName.getValue(),
            category: this.category.getValue(),
            imageUrl: this.imageUrl,
            selectDate: this.selectDate,
        };
    }
}

export interface PointInfoDTO {
    lat: number;
    lng: number;
    id: string;
    threadName: string;
    category: string;
    imageUrl: string | null
    selectDate: Date | null;
}