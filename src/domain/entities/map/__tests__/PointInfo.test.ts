jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { PointInfo } from '../pointInfo';
import { PointInfoId } from '../../../value-object/map/pointInfoId';
import { GeoLocation } from '../../../value-object/map/geoLocation';
import { Category } from '../../../value-object/map/category';
import { UserId } from '../../../value-object/users/UserId';

describe('PointInfo Entity', () => {
    const validId = '12345678-1234-4000-8000-123456789012';
    const validUserId = '12345678-1234-4000-8000-123456789012';

    describe('create', () => {
        it('should create a new PointInfo', () => {
            const geoLocation = GeoLocation.create(35.6895, 139.6917);
            const category = Category.create('chat');
            const userId = new UserId(validUserId);

            const point = PointInfo.create(geoLocation, category, 'Tokyo', null, userId);

            expect(point).toBeInstanceOf(PointInfo);
            expect(point.getId().getValue()).toBe(validId);
            expect(point.getGeoLocation().getLat()).toBe(35.6895);
            expect(point.getCreatedAt()).toBeInstanceOf(Date);
        });
    });

    describe('toPrimitives', () => {
        it('should return correct DTO', () => {
            const geoLocation = GeoLocation.create(35.6895, 139.6917);
            const category = Category.create('chat');
            const userId = new UserId(validUserId);

            const point = PointInfo.create(geoLocation, category, 'Tokyo', null, userId);
            const dto = point.toPrimitives();

            expect(dto.id).toBe(validId);
            expect(dto.lat).toBe(35.6895);
            expect(dto.lng).toBe(139.6917);
            expect(dto.category).toBe('chat');
            expect(dto.ownerUserId).toBe(validUserId);
            expect(dto.createdAt).toBeInstanceOf(Date);
        });
    });

    describe('reconstitute (fromExisting)', () => {
        it('should recreate from fields', () => {
            const id = PointInfoId.fromExisting(validId);
            const geoLocation = GeoLocation.create(35.6895, 139.6917);
            const category = Category.create('event');
            const userId = new UserId(validUserId);
            const createdAt = new Date('2023-01-01T00:00:00Z');

            const point = PointInfo.fromExisting(id, geoLocation, category, 'Osaka', null, userId, createdAt);

            expect(point.getId().equals(id)).toBe(true);
            expect(point.getAddress()).toBe('Osaka');
            expect(point.getCreatedAt()).toEqual(createdAt);
        });
    });
});
