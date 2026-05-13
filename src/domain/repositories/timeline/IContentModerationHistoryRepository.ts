import { ContentModerationHistory } from '../../entities/timeline/contentModerationHistory';

export interface IContentModerationHistoryRepository {
    save(history: ContentModerationHistory): Promise<void>;
}
