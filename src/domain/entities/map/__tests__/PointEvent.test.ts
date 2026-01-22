jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { PointEvent } from '../PointEvent';
import { PointInfoId } from '../../../value-object/map/pointInfoId';
import { PointEventId } from '../../../value-object/map/pointEventId';
import { ThreadName } from '../../../value-object/map/threadName';

describe('PointEvent Entity', () => {
    const validId = '12345678-1234-4000-8000-123456789012';
    const validPointInfoId = '87654321-4321-4000-8000-210987654321';

    describe('create', () => {
        it('should create a new PointEvent', () => {
            const pointInfoId = PointInfoId.fromExisting(validPointInfoId);
            const name = ThreadName.create('Event Name');
            const startDate = new Date('2023-01-01');
            const endDate = new Date('2023-01-02');

            const event = PointEvent.create(
                pointInfoId,
                name,
                'img.jpg',
                startDate,
                endDate,
                'Detail',
                'http://event.com',
            );

            expect(event).toBeInstanceOf(PointEvent);
            expect(event.getId().getValue()).toBe(validId);
            expect(event.getThreadName().getValue()).toBe('Event Name');
            expect(event.getStartDate()).toEqual(startDate);
            expect(event.getCreatedAt()).toBeInstanceOf(Date);
        });
    });

    describe('toPrimitives', () => {
        it('should return correct DTO', () => {
            const pointInfoId = PointInfoId.fromExisting(validPointInfoId);
            const name = ThreadName.create('Event Name');
            const startDate = new Date('2023-01-01');
            const endDate = new Date('2023-01-02');

            const event = PointEvent.create(
                pointInfoId,
                name,
                'img.jpg',
                startDate,
                endDate,
                'Detail',
                'http://event.com',
            );

            const dto = event.toPrimitives();

            expect(dto.id).toBe(validId);
            expect(dto.pointInfoId).toBe(validPointInfoId);
            expect(dto.threadName).toBe('Event Name');
            expect(dto.detail).toBe('Detail');
            expect(dto.url).toBe('http://event.com');
        });
    });

    describe('fromExisting', () => {
        it('should recreate from fields', () => {
            const id = PointEventId.fromExisting(validId);
            const pointInfoId = PointInfoId.fromExisting(validPointInfoId);
            const name = ThreadName.create('Existing');
            const createdAt = new Date();
            const startDate = new Date();
            const endDate = new Date();

            const event = PointEvent.fromExisting(
                id,
                pointInfoId,
                name,
                'img.jpg',
                createdAt,
                startDate,
                endDate,
                'det',
                'url',
                null,
            );

            expect(event.getId().getValue()).toBe(id.getValue());
            expect(event.getDetail()).toBe('det');
        });
    });
});
