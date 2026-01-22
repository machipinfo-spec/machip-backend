jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { DeleteUserUseCase } from '../DeleteUserUseCase';
import { IUserRepository } from '../../../../domain/repositories/user/IUserRepository';
import { IProfileRepository } from '../../../../domain/repositories/profile/IProfileRepository';
import { IIDRepository } from '../../../../domain/repositories/user/IIDRepository';
import { User } from '../../../../domain/entities/user/user';
import { AuthId } from '../../../../domain/value-object/users/AuthId';
import { UserId } from '../../../../domain/value-object/users/UserId';

// Mock Repositories
const mockUserRepository: IUserRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findByAuthId: jest.fn(),
    findByUserId: jest.fn(),
    findAll: jest.fn(),
    search: jest.fn(),
};

const mockProfileRepository: IProfileRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findByProfileId: jest.fn(),
    findByUserId: jest.fn(),
    findByUserIds: jest.fn(),
    softDelete: jest.fn(),
};

const mockIdRepository: IIDRepository = {
    delete: jest.fn(),
};

describe('DeleteUserUseCase', () => {
    let useCase: DeleteUserUseCase;

    beforeEach(() => {
        useCase = new DeleteUserUseCase(mockUserRepository, mockProfileRepository, mockIdRepository);
        jest.clearAllMocks();
    });

    it('should delete user, profile, and auth id', async () => {
        const authIdString = 'auth-123';
        const userIdString = 'user-123';
        const profileIdString = 'profile-123';

        const mockUser = {
            userId: { getValue: () => userIdString },
        } as unknown as User;

        const mockProfile = {
            profileId: { getValue: () => profileIdString },
        } as unknown as any; // Mocking Profile entity

        (mockUserRepository.findByAuthId as jest.Mock).mockResolvedValue(mockUser);
        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile);

        await useCase.execute(authIdString);

        expect(mockUserRepository.findByAuthId).toHaveBeenCalledWith(expect.any(AuthId));
        expect(mockProfileRepository.findByUserId).toHaveBeenCalledWith(mockUser.userId);
        expect(mockUserRepository.delete).toHaveBeenCalledWith(mockUser);
        expect(mockProfileRepository.softDelete).toHaveBeenCalled();
        expect(mockIdRepository.delete).toHaveBeenCalledWith(expect.any(AuthId));
    });

    it('should throw error if user not found', async () => {
        const authIdString = 'auth-404';

        (mockUserRepository.findByAuthId as jest.Mock).mockResolvedValue(null);

        await expect(useCase.execute(authIdString)).rejects.toThrow('User not found');

        expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error if profile not found', async () => {
        const authIdString = 'auth-123';
        const mockUser = {
            userId: { getValue: () => 'user-123' },
        } as unknown as User;

        (mockUserRepository.findByAuthId as jest.Mock).mockResolvedValue(mockUser);
        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null);

        await expect(useCase.execute(authIdString)).rejects.toThrow('Profile not found');

        expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });
});
