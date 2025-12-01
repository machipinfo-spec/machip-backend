import { v4 as uuidv4 } from 'uuid';
import { IdValueObject } from '../IdValueObject';

export class ResponseId extends IdValueObject<string> {
    private constructor(value: string) {
        super(value);
    }

    public static create(): ResponseId {
        return new ResponseId(uuidv4());
    }

    public static fromExisting(id: string): ResponseId {
        return new ResponseId(id);
    }
}
