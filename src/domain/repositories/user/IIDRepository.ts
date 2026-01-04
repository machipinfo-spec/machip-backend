import { AuthId } from '../../value-object/users/AuthId';

export interface IIDRepository {
    delete(authId: AuthId): Promise<void>;
}
