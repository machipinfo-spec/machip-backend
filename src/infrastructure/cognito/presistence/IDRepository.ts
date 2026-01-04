import { IIDRepository } from '../../../domain/repositories/user/IIDRepository';
import { AuthId } from '../../../domain/value-object/users/AuthId';
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';

export class IDRepository implements IIDRepository {
    private client: CognitoIdentityProviderClient;
    private userPoolId: string;

    constructor() {
        this.client = new CognitoIdentityProviderClient({});
        this.userPoolId = process.env.COGNITO_USER_POOL_ID || '';
    }

    async delete(authId: AuthId): Promise<void> {
        if (!this.userPoolId) {
            throw new Error('COGNITO_USER_POOL_ID is not configured');
        }
        const command = new AdminDeleteUserCommand({
            UserPoolId: this.userPoolId,
            Username: authId.getValue(),
        });
        await this.client.send(command);
    }
}
