import { DeviceTokenRepository } from '../DeviceTokenRepository';
import { getDbAndAuth } from '../../../config/firebaseAdmin';
import { DeviceToken } from '../../../../../domain/entities/user/DeviceToken';

// Mock getDbAndAuth
jest.mock('../../../config/firebaseAdmin', () => ({
    getDbAndAuth: jest.fn(),
}));

describe('DeviceTokenRepository', () => {
    let repository: DeviceTokenRepository;
    let mockDb: any;
    let mockCollection: any;
    let mockBatch: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockCollection = {
            doc: jest.fn().mockReturnThis(),
            set: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
            where: jest.fn().mockReturnThis(),
        };

        mockBatch = {
            delete: jest.fn(),
            commit: jest.fn(),
        };

        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
            batch: jest.fn().mockReturnValue(mockBatch),
        };

        (getDbAndAuth as jest.Mock).mockResolvedValue({ db: mockDb });

        repository = new DeviceTokenRepository();
    });

    const tokenString = 'test-token-123';
    const userId = 'user-123';
    const platform = 'ios';
    const now = new Date();

    describe('save', () => {
        it('should save a device token', async () => {
            const token = DeviceToken.reconstruct(tokenString, userId, platform, now, now);
            await repository.save(token);

            expect(mockDb.collection).toHaveBeenCalledWith('device_tokens');
            expect(mockCollection.doc).toHaveBeenCalledWith(tokenString);
            expect(mockCollection.set).toHaveBeenCalledWith({
                token: tokenString,
                userId: userId,
                platform: platform,
                createdAt: now,
                lastUsedAt: now,
            });
        });
    });

    describe('findByToken', () => {
        it('should return token if found', async () => {
            const data = {
                token: tokenString,
                userId: userId,
                platform: platform,
                createdAt: now,
                lastUsedAt: now,
            };

            mockCollection.get.mockResolvedValue({
                exists: true,
                data: () => data,
            });

            const result = await repository.findByToken(tokenString);
            expect(mockCollection.doc).toHaveBeenCalledWith(tokenString);
            expect(result).not.toBeNull();
            expect(result?.getToken()).toBe(tokenString);
        });

        it('should return null if not found', async () => {
            mockCollection.get.mockResolvedValue({ exists: false });
            const result = await repository.findByToken('non-existent');
            expect(result).toBeNull();
        });
    });

    describe('findByUserId', () => {
        it('should return tokens for user', async () => {
            const data = {
                token: tokenString,
                userId: userId,
                platform: platform,
                createdAt: now,
                lastUsedAt: now,
            };

            mockCollection.get.mockResolvedValue({
                empty: false,
                docs: [{ data: () => data }],
            });

            const results = await repository.findByUserId(userId);
            expect(mockCollection.where).toHaveBeenCalledWith('userId', '==', userId);
            expect(results).toHaveLength(1);
            expect(results[0].getUserId()).toBe(userId);
        });
    });

    describe('delete', () => {
        it('should delete token', async () => {
            await repository.delete(tokenString);
            expect(mockCollection.doc).toHaveBeenCalledWith(tokenString);
            expect(mockCollection.delete).toHaveBeenCalled();
        });
    });

    describe('deleteTokens', () => {
        it('should batch delete tokens', async () => {
            const tokens = ['t1', 't2'];
            await repository.deleteTokens(tokens);

            expect(mockDb.batch).toHaveBeenCalled();
            expect(mockCollection.doc).toHaveBeenCalledWith('t1');
            expect(mockCollection.doc).toHaveBeenCalledWith('t2');
            expect(mockBatch.delete).toHaveBeenCalledTimes(2);
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should do nothing if empty', async () => {
            await repository.deleteTokens([]);
            expect(mockDb.batch).not.toHaveBeenCalled();
        });
    });
});
