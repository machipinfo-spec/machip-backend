import { v4 as uuidv4 } from 'uuid';
import { IdValueObject } from '../IdValueObject';

export class PointInfoId extends IdValueObject<string> {
    private constructor(value: string) {
        super(value);
    }

    public static create(): PointInfoId {
        return new PointInfoId(uuidv4());
    }

    public static fromExisting(id: string): PointInfoId {
        return new PointInfoId(id);
    }
}
