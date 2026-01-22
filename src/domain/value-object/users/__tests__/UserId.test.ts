import { UserId } from '../UserId';

jest.mock('uuid', () => {
    let count = 0;
    return {
        v4: () => {
            count++;
            return `12345678-1234-4000-8000-12345678900${count}`;
        },
    };
});

describe('UserId', () => {
    it('should create new ID', () => {
        const id1 = UserId.create();
        const id2 = UserId.create();
        expect(id1.getValue()).toBeDefined();
        expect(id1.getValue()).not.toBe(id2.getValue());
    });

    it('should create from existing ID', () => {
        const value = '12345678-1234-4123-8123-1234567890ab';
        const id = UserId.fromExisting(value);
        expect(id.getValue()).toBe(value);
    });

    it('should validate ID format', () => {
        expect(() => UserId.fromExisting('invalid-uuid')).toThrow('Invalid UUID format');
    });

    it('should identify system user', () => {
        const systemUser = UserId.SYSTEM_ID;
        expect(systemUser.isSystem()).toBe(true);

        const normalUser = UserId.create();
        expect(normalUser.isSystem()).toBe(false);
    });

    it('should be comparable', () => {
        const value = '12345678-1234-4123-8123-1234567890ab';
        const id1 = UserId.fromExisting(value);
        const id2 = UserId.fromExisting(value);
        const id3 = UserId.fromExisting('12345678-1234-4123-8123-1234567890ac');

        expect(id1.equals(id2)).toBe(true);
        expect(id1.equals(id3)).toBe(false);
    });
});
