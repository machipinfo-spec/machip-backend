import { v4 as uuidv4 } from 'uuid';
import { IdValueObject } from '../IdValueObject';

export class ContentModerationHistoryId extends IdValueObject<string> {
    private constructor(value: string) {
        super(value);
    }

    public static create(): ContentModerationHistoryId {
        return new ContentModerationHistoryId(uuidv4());
    }

    public static fromExisting(id: string): ContentModerationHistoryId {
        return new ContentModerationHistoryId(id);
    }
}
