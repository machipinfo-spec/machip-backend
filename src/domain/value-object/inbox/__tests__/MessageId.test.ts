import { MessageId } from '../MessageId';
import { v4 as uuidv4 } from 'uuid';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const ANOTHER_UUID = '550e8400-e29b-41d4-a716-446655440001';

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('550e8400-e29b-41d4-a716-446655440000'),
}));

describe('MessageId', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new instance with a UUID', () => {
        const id = MessageId.create();
        expect(id.getValue()).toBe(VALID_UUID);
        expect(uuidv4).toHaveBeenCalled();
    });

    it('should create from existing string', () => {
        const id = MessageId.fromExisting(VALID_UUID);
        expect(id.getValue()).toBe(VALID_UUID);
    });

    it('should throw error for invalid UUID', () => {
        expect(() => MessageId.fromExisting('invalid-uuid')).toThrow();
    });

    it('should regenerate a new id', () => {
        const id = MessageId.fromExisting(VALID_UUID);
        (uuidv4 as jest.Mock).mockReturnValueOnce(ANOTHER_UUID);

        const newId = id.regenerate();
        expect(newId.getValue()).toBe(ANOTHER_UUID);
        expect(newId).not.toBe(id);
    });

    it('should be equal to another ID with same value', () => {
        const id1 = MessageId.fromExisting(VALID_UUID);
        const id2 = MessageId.fromExisting(VALID_UUID);
        expect(id1.equals(id2)).toBe(true);
    });

    it('should not be equal to ID with different value', () => {
        const id1 = MessageId.fromExisting(VALID_UUID);
        const id2 = MessageId.fromExisting(ANOTHER_UUID);
        expect(id1.equals(id2)).toBe(false);
    });
});
