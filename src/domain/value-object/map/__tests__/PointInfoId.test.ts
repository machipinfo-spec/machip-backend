import { PointInfoId } from '../pointInfoId';

jest.mock('uuid', () => {
    let count = 0;
    return {
        v4: () => {
            count++;
            return `12345678-1234-4000-8000-12345678900${count}`;
        },
    };
});

describe('PointInfoId', () => {
    it('should create new ID', () => {
        const id = PointInfoId.create();
        expect(id.getValue()).toBeDefined();
        expect(id.getValue().length).toBeGreaterThan(0);
    });

    it('should create from existing ID', () => {
        const value = '12345678-1234-4123-8123-1234567890ab';
        const id = PointInfoId.fromExisting(value);
        expect(id.getValue()).toBe(value);
    });

    it('should be comparable', () => {
        const value = '12345678-1234-4123-8123-1234567890ab';
        const id1 = PointInfoId.fromExisting(value);
        const id2 = PointInfoId.fromExisting(value);
        const id3 = PointInfoId.fromExisting('12345678-1234-4123-8123-1234567890ac');

        expect(id1.equals(id2)).toBe(true);
        expect(id1.equals(id3)).toBe(false);
    });
});
