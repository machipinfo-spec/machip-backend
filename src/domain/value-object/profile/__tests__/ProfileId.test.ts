import { ProfileId } from '../ProfileId';

jest.mock('uuid', () => {
    let count = 0;
    return {
        v4: () => {
            count++;
            return `12345678-1234-4000-8000-12345678900${count}`;
        },
    };
});

describe('ProfileId', () => {
    it('should create new ID', () => {
        const id1 = ProfileId.create();
        const id2 = ProfileId.create();
        expect(id1.getValue()).toBeDefined();
        expect(id1.getValue()).not.toBe(id2.getValue());
    });

    it('should create from existing ID', () => {
        const value = '12345678-1234-4123-8123-1234567890ab';
        const id = ProfileId.fromExisting(value);
        expect(id.getValue()).toBe(value);
    });

    it('should be comparable', () => {
        const value = '12345678-1234-4123-8123-1234567890ab';
        const id1 = ProfileId.fromExisting(value);
        const id2 = ProfileId.fromExisting(value);
        const id3 = ProfileId.fromExisting('12345678-1234-4123-8123-1234567890ac');

        expect(id1.equals(id2)).toBe(true);
        expect(id1.equals(id3)).toBe(false);
    });
});
