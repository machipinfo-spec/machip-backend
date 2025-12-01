import { v4 as uuidv4 } from 'uuid';
import { IdValueObject } from '../IdValueObject';

export class ThreadId extends IdValueObject<string> {
    private constructor(value: string) {
        super(value);
    }

    public static create(): ThreadId {
        return new ThreadId(uuidv4());
    }

    public static fromExisting(id: string): ThreadId {
        return new ThreadId(id);
    }
}
