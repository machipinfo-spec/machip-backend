import { PointInfoId } from '../../value-object/map/pointInfoId';
import { GeoLocation } from '../../value-object/map/geoLocation';
import { Category } from '../../value-object/map/category';
import { UserId } from '../../value-object/users/UserId'; // Import UserId

export class PointInfo {
    private constructor(
        private readonly id: PointInfoId,
        private readonly geoLocation: GeoLocation,
        private readonly category: Category,
        private readonly address: string | null,
        private readonly deletedAt: Date | null,
        private readonly ownerUserId: UserId, // New field
    ) {
        Object.freeze(this);
    }

    public static create(
        geoLocation: GeoLocation,
        category: Category,
        address: string | null,
        deletedAt: Date | null,
        ownerUserId: UserId, // New argument
        pointInfoId?: PointInfoId,
    ): PointInfo {
        return new PointInfo(
            pointInfoId || PointInfoId.create(),
            geoLocation,
            category,
            address,
            deletedAt,
            ownerUserId,
        );
    }

    public static fromExisting(
        id: PointInfoId,
        geoLocation: GeoLocation,
        category: Category,
        address: string | null,
        deletedAt: Date | null,
        ownerUserId: UserId, // New argument
    ): PointInfo {
        return new PointInfo(id, geoLocation, category, address, deletedAt, ownerUserId);
    }

    public getId(): PointInfoId {
        return this.id;
    }

    public getGeoLocation(): GeoLocation {
        return this.geoLocation;
    }

    public getCategory(): Category {
        return this.category;
    }

    public getAddress(): string | null {
        return this.address;
    }

    public getOwnerUserId(): UserId {
        return this.ownerUserId;
    }

    public markAsRead(): PointInfo {
        return new PointInfo(this.id, this.geoLocation, this.category, this.address, this.deletedAt, this.ownerUserId);
    }

    public toPrimitives(): PointInfoDTO {
        return {
            id: this.id.getValue(),
            lat: this.geoLocation.getLat(),
            lng: this.geoLocation.getLng(),
            category: this.category.getValue(),
            address: this.address,
            deletedAt: this.deletedAt,
            ownerUserId: this.ownerUserId.getValue(),
        };
    }
}

export interface PointInfoDTO {
    lat: number;
    lng: number;
    id: string;
    category: string;
    address: string | null;
    deletedAt: Date | null;
    ownerUserId: string;
}
