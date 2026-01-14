import { IUserRepository } from '../../../domain/repositories/user/IUserRepository';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';

export interface AdminUserListResult {
    users: {
        authId: string;
        userId: string;
        name: string;
        email: string;
        imageUrl?: string;
    }[];
    nextToken: string | null;
}

export class AdminUserListUseCase {
    constructor(private userRepository: IUserRepository, private profileRepository: IProfileRepository) {}

    async execute(limit: number, search?: string, nextToken?: string): Promise<AdminUserListResult> {
        // Use efficient search (pagination supported)
        const result = await this.userRepository.search({
            limit,
            nextToken,
            keyword: search,
        });

        // Fetch profiles for the found users to get correct display names
        const users = result.users;
        const profileMap = new Map<string, { name: string; imageUrl: string; introduction: string }>();

        if (users.length > 0) {
            const userIds = users.map((u) => u.userId);
            const profiles = await this.profileRepository.findByUserIds(userIds);
            profiles.forEach((p) => {
                profileMap.set(p.userId.getValue(), {
                    name: p.userName.getValue(),
                    imageUrl: p.imageUrl.getValue(),
                    introduction: p.introduction.getValue(),
                });
            });
        }

        return {
            users: users.map((u) => {
                const profile = profileMap.get(u.userId.getValue());
                return {
                    authId: u.authId.getValue(),
                    userId: u.userId.getValue(),
                    name: profile ? profile.name : u.name.getValue(), // Prefer profile name, fallback to user name
                    email: u.email.getValue(),
                    imageUrl: profile ? profile.imageUrl : undefined,
                    introduction: profile ? profile.introduction : undefined,
                };
            }),
            nextToken: result.nextToken,
        };
    }
}
