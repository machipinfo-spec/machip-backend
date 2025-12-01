import { ValueObject } from '../ValueObject';

export class ReactionType extends ValueObject<string> {
    constructor(value: string) {
        super(value);
        Object.freeze(this);
    }

    protected validate(): void {
        if (this.value === null || this.value === undefined || this.value === '') {
            throw new Error('リアクションは空にできません');
        }
    }

    public static create(value: string): ReactionType {
        return new ReactionType(value);
    }
    public static readonly LIKE = ReactionType.create(':like:');

}
