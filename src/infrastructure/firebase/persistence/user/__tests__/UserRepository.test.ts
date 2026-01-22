import { UserRepository } from '../UserRepository';
import { getDbAndAuth } from '../../../config/firebaseAdmin';
import { User } from '../../../../../domain/entities/user/user';
import { AuthId } from '../../../../../domain/value-object/users/AuthId';
import { UserId } from '../../../../../domain/value-object/users/UserId';
import { UserName } from '../../../../../domain/value-object/users/UserName';
import { Email } from '../../../../../domain/value-object/users/Email';

// Mock getDbAndAuth
jest.mock('../../../config/firebaseAdmin', () => ({
    getDbAndAuth: jest.fn(),
}));

// Mock uuid to avoid ESM issues
jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-1234567890ab',
}));

describe('UserRepository', () => {
    let userRepository: UserRepository;
    let mockDb: any;
    let mockCollection: any;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup mock Firestore
        mockCollection = {
            doc: jest.fn().mockReturnThis(),
            delete: jest.fn(),
            where: jest.fn().mockReturnThis(),
            get: jest.fn(),
            add: jest.fn(),
            orderBy: jest.fn().mockReturnThis(),
            startAfter: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
        };

        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
        };

        (getDbAndAuth as jest.Mock).mockResolvedValue({ db: mockDb });

        userRepository = new UserRepository();
    });

    // Helper to create a dummy user
    const createDummyUser = () => {
        return User.reconstitute(
            new AuthId('auth-id-123'),
            new UserId('12345678-1234-4123-8123-1234567890ab'),
            new UserName('Test User'),
            new Email('test@example.com'),
        );
    };

    describe('delete', () => {
        it('should delete a user document', async () => {
            const user = createDummyUser();
            await userRepository.delete(user);

            expect(mockDb.collection).toHaveBeenCalledWith('Users');
            expect(mockCollection.doc).toHaveBeenCalledWith(user.userId.getValue());
            expect(mockCollection.delete).toHaveBeenCalled();
        });
    });

    describe('findByAuthId', () => {
        it('should return a user if found', async () => {
            const authId = new AuthId('auth-id-123');
            const userData = {
                authId: 'auth-id-123',
                userId: '12345678-1234-4123-8123-1234567890ab',
                name: 'Test User',
                email: 'test@example.com',
            };

            mockCollection.get.mockResolvedValue({
                empty: false,
                docs: [{ data: () => userData }],
            });

            const result = await userRepository.findByAuthId(authId);

            expect(mockDb.collection).toHaveBeenCalledWith('Users');
            expect(mockCollection.where).toHaveBeenCalledWith('authId', '==', authId.getValue());
            expect(result).not.toBeNull();
            expect(result?.userId.getValue()).toBe(userData.userId);
        });

        it('should return null if not found', async () => {
            const authId = new AuthId('auth-id-123');
            mockCollection.get.mockResolvedValue({
                empty: true,
                docs: [],
            });

            const result = await userRepository.findByAuthId(authId);
            expect(result).toBeNull();
        });
    });

    describe('findByUserId', () => {
        it('should return a user if found', async () => {
            const userId = new UserId('12345678-1234-4123-8123-1234567890ab');
            const userData = {
                authId: 'auth-id-123',
                userId: '12345678-1234-4123-8123-1234567890ab',
                name: 'Test User',
                email: 'test@example.com',
            };

            mockCollection.get.mockResolvedValue({
                empty: false,
                docs: [{ data: () => userData }],
            });

            const result = await userRepository.findByUserId(userId);

            expect(mockDb.collection).toHaveBeenCalledWith('Users');
            expect(mockCollection.where).toHaveBeenCalledWith('userId', '==', userId.getValue());
            expect(result).not.toBeNull();
            expect(result?.userId.getValue()).toBe(userData.userId);
        });

        it('should return null if not found', async () => {
            const userId = new UserId('12345678-1234-4123-8123-1234567890ab');
            mockCollection.get.mockResolvedValue({
                empty: true,
                docs: [],
            });

            const result = await userRepository.findByUserId(userId);
            expect(result).toBeNull();
        });
    });

    describe('findAll', () => {
        it('should return all users', async () => {
            const userData1 = {
                authId: 'auth-1',
                userId: '12345678-1234-4123-8123-1234567890a1',
                name: 'User 1',
                email: 'user1@example.com',
            };
            const userData2 = {
                authId: 'auth-2',
                userId: '12345678-1234-4123-8123-1234567890a2',
                name: 'User 2',
                email: 'user2@example.com',
            };

            mockCollection.get.mockResolvedValue({
                docs: [{ data: () => userData1 }, { data: () => userData2 }],
            });

            const results = await userRepository.findAll();
            expect(results).toHaveLength(2);
            expect(results[0].userId.getValue()).toBe(userData1.userId);
            expect(results[1].userId.getValue()).toBe(userData2.userId);
        });
    });

    describe('save', () => {
        it('should add a user document', async () => {
            const user = createDummyUser();
            await userRepository.save(user);

            expect(mockDb.collection).toHaveBeenCalledWith('Users');
            expect(mockCollection.add).toHaveBeenCalledWith({
                authId: user.authId.getValue(),
                userId: user.userId.getValue(),
                name: user.name.getValue(),
                email: user.email.getValue(),
            });
        });
    });

    describe('search', () => {
        it('should search with pagination options', async () => {
            const params = {
                limit: 10,
                nextToken: 'some-token',
                keyword: 'test',
            };

            const userData = {
                authId: 'auth-id-123',
                userId: '12345678-1234-4123-8123-1234567890ab',
                name: 'Test User',
                email: 'test@example.com',
            };

            mockCollection.get.mockResolvedValue({
                docs: [{ data: () => userData, id: 'doc-id' }],
            });

            const result = await userRepository.search(params);

            expect(mockCollection.orderBy).toHaveBeenCalledWith('userId');
            expect(mockCollection.startAfter).toHaveBeenCalledWith(params.nextToken);
            expect(mockCollection.limit).toHaveBeenCalledWith(params.limit);

            expect(result.users).toHaveLength(1);
            expect(result.nextToken).toBe(userData.userId);
        });

        it('should filter by keyword in memory', async () => {
            const params = { keyword: 'MATCH' };
            const matchUser = {
                authId: 'auth-1',
                userId: '12345678-1234-4123-8123-1234567890ab',
                name: 'Match User',
                email: 'test@example.com',
            };
            const noMatchUser = {
                authId: 'auth-2',
                userId: '12345678-1234-4123-8123-1234567890ac',
                name: 'Other User',
                email: 'other@example.com',
            };

            mockCollection.get.mockResolvedValue({
                docs: [
                    { data: () => matchUser },
                    { data: () => noMatchUser }, // This one should be filtered out
                ],
            });

            const result = await userRepository.search(params);

            expect(result.users).toHaveLength(1);
            expect(result.users[0].name.getValue()).toBe('Match User');
        });
    });
});
