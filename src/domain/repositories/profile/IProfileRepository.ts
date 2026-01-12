import { Profile } from '../../entities/profile/profile';
import { ProfileId } from '../../value-object/profile/ProfileId';
import { UserId } from '../../value-object/users/UserId';

export interface IProfileRepository {
    save(profile: Profile): Promise<void>;
    delete(profile: Profile): Promise<void>;
    update(profile: Profile): Promise<void>;
    findByProfileId(profileId: ProfileId): Promise<Profile | null>;
    findByUserId(userId: UserId): Promise<Profile | null>;
    softDelete(profileId: ProfileId): Promise<void>;
}
