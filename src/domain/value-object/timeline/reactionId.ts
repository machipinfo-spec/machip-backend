import { v4 as uuidv4 } from 'uuid';
import { IdValueObject } from '../IdValueObject';

export class ReactionsId extends IdValueObject<string> {
    private constructor(value: string) {
        super(value);
    }

    public static create(): ReactionsId {
        return new ReactionsId(uuidv4());
    }

    public static fromExisting(id: string): ReactionsId {
        return new ReactionsId(id);
    }
}
