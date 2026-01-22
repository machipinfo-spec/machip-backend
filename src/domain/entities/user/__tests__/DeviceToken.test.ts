import { DeviceToken } from '../DeviceToken';

describe('DeviceToken', () => {
    const validToken = 'valid_token_string';
    const validUserId = 'user_123';
    const validPlatform = 'web';

    describe('create', () => {
        it('should create a new DeviceToken with current timestamp', () => {
            const token = DeviceToken.create(validToken, validUserId, validPlatform);

            expect(token.getToken()).toBe(validToken);
            expect(token.getUserId()).toBe(validUserId);
            expect(token.getPlatform()).toBe(validPlatform);
            expect(token.getCreatedAt()).toBeInstanceOf(Date);
            expect(token.getLastUsedAt()).toBeInstanceOf(Date);
            // CreatedAt and LastUsedAt should be essentially the same time (allow small diff)
            expect(token.getCreatedAt().getTime()).toBeCloseTo(token.getLastUsedAt().getTime(), -2);
        });

        it('should throw error if token is empty', () => {
            expect(() => {
                DeviceToken.create('', validUserId, validPlatform);
            }).toThrow('Device token is required');
        });
    });

    describe('reconstruct', () => {
        it('should reconstruct a DeviceToken from existing data', () => {
            const createdAt = new Date('2023-01-01T00:00:00Z');
            const lastUsedAt = new Date('2023-01-02T00:00:00Z');

            const token = DeviceToken.reconstruct(validToken, validUserId, validPlatform, createdAt, lastUsedAt);

            expect(token.getToken()).toBe(validToken);
            expect(token.getUserId()).toBe(validUserId);
            expect(token.getPlatform()).toBe(validPlatform);
            expect(token.getCreatedAt()).toEqual(createdAt);
            expect(token.getLastUsedAt()).toEqual(lastUsedAt);
        });
    });

    describe('updateLastUsedAt', () => {
        it('should return a new DeviceToken with updated lastUsedAt', async () => {
            const createdAt = new Date('2023-01-01T00:00:00Z');
            const oldLastUsedAt = new Date('2023-01-01T00:00:00Z');
            const token = DeviceToken.reconstruct(validToken, validUserId, validPlatform, createdAt, oldLastUsedAt);

            // Wait a bit to ensure time difference
            await new Promise((resolve) => setTimeout(resolve, 10));

            const updatedToken = token.updateLastUsedAt();

            expect(updatedToken.getToken()).toBe(validToken);
            expect(updatedToken.getUserId()).toBe(validUserId);
            expect(updatedToken.getPlatform()).toBe(validPlatform);
            expect(updatedToken.getCreatedAt()).toEqual(createdAt);
            expect(updatedToken.getLastUsedAt().getTime()).toBeGreaterThan(oldLastUsedAt.getTime());
            expect(updatedToken).not.toBe(token); // Immutability check
        });
    });
});
