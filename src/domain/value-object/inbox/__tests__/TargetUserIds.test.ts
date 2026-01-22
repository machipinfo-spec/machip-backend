import { TargetUserIds } from '../TargetUserIds';
import { UserId } from '../../users/UserId';

// Mock UserId implementation if needed, but using real one is often better for VOs if simple.
// Let's assume UserId works as expected or we can mock it if it has complex validation/dependencies.
// UserId has static create/fromExisting.
jest.mock('../../users/UserId', () => ({
    UserId: {
        create: jest.fn(() => ({
            getValue: () => 'uuid-' + Math.random(),
            equals: (o: any) => o.getValue() === 'uuid-' + Math.random(),
        })), // simplistic mock
        fromExisting: jest.fn((id) => ({ getValue: () => id, equals: (o: any) => o.getValue() === id })),
    },
}));

describe('TargetUserIds', () => {
    const createMockUser = (id: string) =>
        ({
            getValue: () => id,
            equals: (other: any) => other.getValue() === id,
        } as any);

    it('should create with unique users', () => {
        const u1 = createMockUser('u1');
        const u2 = createMockUser('u2');
        const u1Dup = createMockUser('u1');

        const target = new TargetUserIds([u1, u2, u1Dup]);
        expect(target.count()).toBe(2);
        expect(target.contains(u1)).toBe(true);
    });

    it('should throw error if empty', () => {
        expect(() => new TargetUserIds([])).toThrow('Target user IDs cannot be empty');
    });

    it('should throw error if > 10000', () => {
        // Mocking large array
        const users = Array.from({ length: 10001 }, (_, i) => createMockUser(`u${i}`));
        expect(() => new TargetUserIds(users)).toThrow('Target user IDs cannot exceed 10,000 users');
    });

    it('should add user', () => {
        const u1 = createMockUser('u1');
        const u2 = createMockUser('u2');
        const initial = new TargetUserIds([u1]);
        const added = initial.add(u2);

        expect(added.count()).toBe(2);
        expect(added.contains(u2)).toBe(true);
    });

    it('should remove user', () => {
        const u1 = createMockUser('u1');
        const u2 = createMockUser('u2');
        const initial = new TargetUserIds([u1, u2]);
        const removed = initial.remove(u1);

        expect(removed.count()).toBe(1);
        expect(removed.contains(u1)).toBe(false);
    });

    it('should not allow removing all users', () => {
        const u1 = createMockUser('u1');
        const initial = new TargetUserIds([u1]);
        expect(() => initial.remove(u1)).toThrow('Cannot remove all target users');
    });

    it('should intersect correctly', () => {
        const u1 = createMockUser('u1');
        const u2 = createMockUser('u2');
        const u3 = createMockUser('u3');

        const t1 = new TargetUserIds([u1, u2]);
        const t2 = new TargetUserIds([u2, u3]);

        const intersection = t1.intersect(t2);
        expect(intersection.count()).toBe(1);
        expect(intersection.contains(u2)).toBe(true);
    });
});
