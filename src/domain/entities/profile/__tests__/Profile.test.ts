jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { Profile } from '../profile';
import { UserId } from '../../../value-object/users/UserId';
import { UserName } from '../../../value-object/users/UserName';
import { ImageUrl } from '../../../value-object/users/ImageUrl';
import { Introduction } from '../../../value-object/profile/Introduction';
import { ProfileUrl } from '../../../value-object/profile/ProfileUrl';
import { ProfileId } from '../../../value-object/profile/ProfileId';

describe('Profile Entity', () => {
    const validUserId = '12345678-1234-4000-8000-123456789012';
    const validProfileId = '12345678-1234-4000-8000-123456789012';

    describe('create', () => {
        it('should create a new Profile', () => {
            const userId = new UserId(validUserId);
            const userName = UserName.create('Test User');
            const imageUrl = ImageUrl.create('http://example.com/avatar.jpg');
            const introduction = Introduction.create('Hello');
            const url = ProfileUrl.create('http://example.com');

            const profile = Profile.create(userId, userName, imageUrl, introduction, url);

            expect(profile).toBeInstanceOf(Profile);
            expect(profile.profileId.getValue()).toBe(validProfileId); // Mocked UUID
            expect(profile.userId.equals(userId)).toBe(true);
            expect(profile.userName.getValue()).toBe('Test User');
        });
    });

    describe('updateProfile', () => {
        it('should update profile fields immutably', () => {
            const userId = new UserId(validUserId);
            const profile = Profile.create(
                userId,
                UserName.create('Old Name'),
                ImageUrl.create('old.jpg'),
                Introduction.create('Old Intro'),
                ProfileUrl.create('old.com'),
            );

            const updated = profile.updateProfile(
                UserName.create('New Name'),
                ImageUrl.create('new.jpg'),
                Introduction.create('New Intro'),
                ProfileUrl.create('new.com'),
            );

            expect(updated).not.toBe(profile); // Immutable
            expect(updated.userName.getValue()).toBe('New Name');
            expect(updated.imageUrl.getValue()).toBe('new.jpg');
            expect(updated.profileId.equals(profile.profileId)).toBe(true);
        });
    });

    describe('DTO Conversion', () => {
        it('should convert to DTO and back', () => {
            const dto = {
                profileId: validProfileId,
                userId: validUserId,
                userName: 'DTO User',
                imageUrl: 'dto.jpg',
                introduction: 'DTO Intro',
                url: 'dto.com',
            };

            const profile = Profile.fromDTO(dto);

            expect(profile.profileId.getValue()).toBe(dto.profileId);
            expect(profile.userName.getValue()).toBe(dto.userName);
            expect(profile.toDTO()).toEqual(dto);
        });
    });

    describe('isComplete', () => {
        it('should return true if all fields are filled', () => {
            const profile = Profile.fromDTO({
                profileId: validProfileId,
                userId: validUserId,
                userName: 'User',
                imageUrl: 'img.jpg',
                introduction: 'Intro',
                url: '',
            });
            expect(profile.isComplete()).toBe(true);
        });
    });
});
