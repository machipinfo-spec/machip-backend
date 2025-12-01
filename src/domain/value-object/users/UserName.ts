import { ValueObject } from '../ValueObject';

export class UserName extends ValueObject<string> {
    protected validate(): void {
        if (!this.value || this.value.trim().length === 0) {
            throw new Error('User name cannot be empty');
        }

        if (this.value.length > 100) {
            throw new Error('User name is too long (maximum 100 characters)');
        }
    }

    public static create(name: string): UserName {
        return new UserName(name);
    }
}
