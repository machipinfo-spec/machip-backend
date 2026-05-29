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
        private readonly ownerUserId: UserId,
        private readonly createdAt: Date, // New field
        private readonly iconEmoji: string | null,
        private readonly iconColor: string | null,
    ) {
        Object.freeze(this);
    }

    public static create(
        geoLocation: GeoLocation,
        category: Category,
        address: string | null,
        deletedAt: Date | null,
        ownerUserId: UserId,
        pointInfoId?: PointInfoId,
        iconEmoji?: string | null,
        iconColor?: string | null,
    ): PointInfo {
        const emojiVal = iconEmoji || (category.getValue() === 'event' ? '🔥' : '📍');
        const colorVal = iconColor || (category.getValue() === 'event' ? '#F97316' : '#10B981');
        return new PointInfo(
            pointInfoId || PointInfoId.create(),
            geoLocation,
            category,
            address,
            deletedAt,
            ownerUserId,
            new Date(),
            emojiVal,
            colorVal,
        );
    }

    public static fromExisting(
        id: PointInfoId,
        geoLocation: GeoLocation,
        category: Category,
        address: string | null,
        deletedAt: Date | null,
        ownerUserId: UserId,
        createdAt: Date,
        iconEmoji: string | null = null,
        iconColor: string | null = null,
    ): PointInfo {
        return new PointInfo(id, geoLocation, category, address, deletedAt, ownerUserId, createdAt, iconEmoji, iconColor);
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

    public getCreatedAt(): Date {
        return this.createdAt;
    }

    public getIconEmoji(): string | null {
        return this.iconEmoji;
    }

    public getIconColor(): string | null {
        return this.iconColor;
    }

    public markAsRead(): PointInfo {
        return new PointInfo(
            this.id,
            this.geoLocation,
            this.category,
            this.address,
            this.deletedAt,
            this.ownerUserId,
            this.createdAt,
            this.iconEmoji,
            this.iconColor,
        );
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
            createdAt: this.createdAt,
            iconEmoji: this.iconEmoji,
            iconColor: this.iconColor,
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
    createdAt: Date;
    iconEmoji: string | null;
    iconColor: string | null;
}
