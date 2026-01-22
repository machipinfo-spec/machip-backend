import { BroadcastId } from '../BroadcastId';
import { v4 as uuidv4 } from 'uuid';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const ANOTHER_UUID = '550e8400-e29b-41d4-a716-446655440001';

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('550e8400-e29b-41d4-a716-446655440000'), // VALID_UUID cannot be used inside factory
}));

describe('BroadcastId', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new instance with a UUID', () => {
        const id = BroadcastId.create();
        expect(id.getValue()).toBe(VALID_UUID);
        expect(uuidv4).toHaveBeenCalled();
    });

    it('should create from existing string', () => {
        const id = BroadcastId.fromExisting(VALID_UUID);
        expect(id.getValue()).toBe(VALID_UUID);
    });

    it('should throw error for invalid UUID', () => {
        expect(() => BroadcastId.fromExisting('invalid-uuid')).toThrow();
    });

    it('should regenerate a new id', () => {
        const id = BroadcastId.fromExisting(VALID_UUID);
        // We need to mock return value change for this test or simple check call
        (uuidv4 as jest.Mock).mockReturnValueOnce(ANOTHER_UUID);

        const newId = id.regenerate();
        expect(newId.getValue()).toBe(ANOTHER_UUID);
        expect(newId).not.toBe(id);
    });

    it('should be equal to another ID with same value', () => {
        const id1 = BroadcastId.fromExisting(VALID_UUID);
        const id2 = BroadcastId.fromExisting(VALID_UUID);
        expect(id1.equals(id2)).toBe(true);
    });

    it('should not be equal to ID with different value', () => {
        const id1 = BroadcastId.fromExisting(VALID_UUID);
        const id2 = BroadcastId.fromExisting(ANOTHER_UUID);
        expect(id1.equals(id2)).toBe(false);
    });
});
