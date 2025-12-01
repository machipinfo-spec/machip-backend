import { ValueObject } from '../ValueObject';

export class Introduction extends ValueObject<string> {
    protected validate(): void {
        if (this.value.length > 1000) {
            throw new Error('Introduction is too long (maximum 1000 characters)');
        }
    }

    public static create(name: string): Introduction {
        return new Introduction(name);
    }
}
