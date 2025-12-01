import { ValueObject } from '../ValueObject';

export class GeoLocation extends ValueObject<{
    lat: number;
    lng: number;
}> {
    protected validate(): void {
        if (this.value.lat < -90 || this.value.lat > 90 || this.value.lng < -180 || this.value.lng > 180) {
            throw new Error('Invalid coordinates: Latitude must be between -90 and 90, and Longitude must be between -180 and 180.');
        }
    }

    constructor(value: { lat: number; lng: number }) {
        super(value);
        Object.freeze(this);
    }

    static create(lat: number, lng: number): GeoLocation {
        return new GeoLocation({ lat, lng });
    }

    static fromCoordinates(lat: number, lng: number): GeoLocation {
        return GeoLocation.create(lat, lng);
    }

    getLat(): number {
        return this.value.lat;
    }

    getLng(): number {
        return this.value.lng;
    }
}
