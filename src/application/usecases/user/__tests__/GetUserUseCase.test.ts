jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { GetUserUseCase } from '../GetUserUseCase';
import { IUserRepository } from '../../../../domain/repositories/user/IUserRepository';
import { User } from '../../../../domain/entities/user/user';
// import { AuthId } from '../../../../domain/value-object/users/AuthId';
// AuthId is used internally by UseCase, but we pass string to execute.
// We need to mock return value of repository.

// Mock Repository
const mockUserRepository: IUserRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findByAuthId: jest.fn(),
    findByUserId: jest.fn(),
    findAll: jest.fn(),
    search: jest.fn(),
};

describe('GetUserUseCase', () => {
    let useCase: GetUserUseCase;

    beforeEach(() => {
        useCase = new GetUserUseCase(mockUserRepository);
        jest.clearAllMocks();
    });

    it('should return user if found', async () => {
        const authId = 'auth-123';
        const mockUser = {
            authId: { getValue: () => authId },
            userId: { getValue: () => 'user-123' },
            name: { getValue: () => 'Test User' },
            email: { getValue: () => 'test@example.com' },
        } as unknown as User;

        (mockUserRepository.findByAuthId as jest.Mock).mockResolvedValue(mockUser);

        const result = await useCase.execute(authId);

        expect(mockUserRepository.findByAuthId).toHaveBeenCalledTimes(1);
        expect(result).toBe(mockUser);
    });

    it('should return null if user not found', async () => {
        const authId = 'auth-404';

        (mockUserRepository.findByAuthId as jest.Mock).mockResolvedValue(null);

        const result = await useCase.execute(authId);

        expect(mockUserRepository.findByAuthId).toHaveBeenCalledTimes(1);
        expect(result).toBeNull();
    });
});
