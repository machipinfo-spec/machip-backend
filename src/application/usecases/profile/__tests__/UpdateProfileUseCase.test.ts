jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { UpdateProfileUseCase } from '../UpdateProfileUseCase';
import { IProfileRepository } from '../../../../domain/repositories/profile/IProfileRepository';
import { Profile } from '../../../../domain/entities/profile/profile';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { UserName } from '../../../../domain/value-object/users/UserName';
import { ImageUrl } from '../../../../domain/value-object/users/ImageUrl';
import { Introduction } from '../../../../domain/value-object/profile/Introduction';
import { ProfileUrl } from '../../../../domain/value-object/profile/ProfileUrl';
import { ProfileId } from '../../../../domain/value-object/profile/ProfileId';

// Mock Repository
const mockProfileRepository: IProfileRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findByProfileId: jest.fn(),
    findByUserId: jest.fn(),
    findByUserIds: jest.fn(),
    softDelete: jest.fn(),
};

describe('UpdateProfileUseCase', () => {
    let useCase: UpdateProfileUseCase;
    const validUserId = '12345678-1234-4000-8000-123456789012';

    beforeEach(() => {
        useCase = new UpdateProfileUseCase(mockProfileRepository);
        jest.clearAllMocks();
    });

    it('should update profile fields', async () => {
        const existingProfile = Profile.create(
            new UserId(validUserId),
            UserName.create('Old Name'),
            ImageUrl.create('old.jpg'),
            Introduction.create('Old Intro'),
            ProfileUrl.create('old.com'),
        );

        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(existingProfile);

        const request = {
            userId: validUserId,
            userName: 'New Name',
            introduction: 'New Intro',
            url: 'new.com',
        };

        const result = await useCase.execute(request);

        expect(result.error).toBeUndefined();
        expect(result.profile).not.toBeNull();
        expect(result.profile?.userName.getValue()).toBe('New Name');
        expect(result.profile?.introduction.getValue()).toBe('New Intro');
        expect(result.profile?.imageUrl.getValue()).toBe('old.jpg'); // Unchanged
        expect(result.profile?.url.getValue()).toBe('new.com');

        expect(mockProfileRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should return error if profile not found', async () => {
        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null);

        const request = {
            userId: validUserId,
            userName: 'New Name',
            url: null,
        };

        const result = await useCase.execute(request);

        expect(result.error).toBe('Profile not found');
        expect(result.profile).toBeNull();
        expect(mockProfileRepository.update).not.toHaveBeenCalled();
    });
});
