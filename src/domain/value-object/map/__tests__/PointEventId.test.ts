import { PointEventId } from '../PointEventId';

jest.mock('uuid', () => {
    let count = 0;
    return {
        v4: () => {
            count++;
            return `12345678-1234-4000-8000-12345678900${count}`;
        },
    };
});

describe('PointEventId', () => {
    it('should create new ID', () => {
        const id1 = PointEventId.create();
        const id2 = PointEventId.create();
        expect(id1.getValue()).toBeDefined();
        expect(id1.getValue()).not.toBe(id2.getValue());
    });

    it('should create from existing string', () => {
        const value = '12345678-1234-4123-8123-1234567890ab';
        const id = PointEventId.fromExisting(value);
        expect(id.getValue()).toBe(value);
    });

    it('should be comparable', () => {
        const value = '12345678-1234-4123-8123-1234567890ab';
        const id1 = PointEventId.fromExisting(value);
        const id2 = PointEventId.fromExisting(value);
        const id3 = PointEventId.fromExisting('12345678-1234-4123-8123-1234567890ac');

        expect(id1.getValue()).toBe(id2.getValue());
        expect(id1.getValue()).not.toBe(id3.getValue());
    });
});
