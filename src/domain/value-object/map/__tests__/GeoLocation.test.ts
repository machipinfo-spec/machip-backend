import { GeoLocation } from '../geoLocation';

describe('GeoLocation', () => {
    it('should create valid location', () => {
        const loc = GeoLocation.create(35.6895, 139.6917);
        expect(loc.getLat()).toBe(35.6895);
        expect(loc.getLng()).toBe(139.6917);
        expect(loc.getValue()).toEqual({ lat: 35.6895, lng: 139.6917 });
    });

    it('should create from coordinates', () => {
        const loc = GeoLocation.fromCoordinates(35.6895, 139.6917);
        expect(loc.getLat()).toBe(35.6895);
        expect(loc.getLng()).toBe(139.6917);
    });

    it('should throw error for invalid latitude', () => {
        expect(() => GeoLocation.create(91, 0)).toThrow('Invalid coordinates');
        expect(() => GeoLocation.create(-91, 0)).toThrow('Invalid coordinates');
    });

    it('should throw error for invalid longitude', () => {
        expect(() => GeoLocation.create(0, 181)).toThrow('Invalid coordinates');
        expect(() => GeoLocation.create(0, -181)).toThrow('Invalid coordinates');
    });

    it('should accept boundary values', () => {
        expect(GeoLocation.create(90, 180).getValue()).toEqual({ lat: 90, lng: 180 });
        expect(GeoLocation.create(-90, -180).getValue()).toEqual({ lat: -90, lng: -180 });
    });
});
