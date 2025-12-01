import { UserName } from '../../../domain/value-object/users/UserName';
import { Email } from '../../../domain/value-object/users/Email';
import { IUserRepository } from '../../../domain/repositories/user/IUserRepository';
import { AuthId } from '../../../domain/value-object/users/AuthId';
import { User } from '../../../domain/entities/user/user';

export class CreateUserUseCase {
    constructor(
        private userRepository: IUserRepository,
    ) {}

    async execute(
        authId: string,
        name: string,
        email: string,
    ): Promise<User> {
        if (await this.userRepository.findByAuthId(new AuthId(authId))) {
            throw new Error('User already exists');
        }

        const user = User.create(new AuthId(authId), new UserName(name), new Email(email));
        await this.userRepository.save(user);
        return user;
    }
}
