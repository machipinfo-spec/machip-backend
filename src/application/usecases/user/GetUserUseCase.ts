import { User } from '../../../domain/entities/user/user';
import { IUserRepository } from '../../../domain/repositories/user/IUserRepository';
import { AuthId } from '../../../domain/value-object/users/AuthId';

export class GetUserUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(authId: string): Promise<User | null> {
        return await this.userRepository.findByAuthId(new AuthId(authId));
    }
}
