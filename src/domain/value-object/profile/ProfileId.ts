import { v4 as uuidv4 } from 'uuid';
import { IdValueObject } from '../IdValueObject';

export class ProfileId extends IdValueObject<string> {
    private constructor(value: string) {
        super(value);
    }

    public static create(): ProfileId {
        return new ProfileId(uuidv4());
    }

    public static fromExisting(id: string): ProfileId {
        return new ProfileId(id);
    }
}
