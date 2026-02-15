export interface ContentModerationRequest {
    targetType: 'thread' | 'response';
    targetId: string;
    content: string;
    imageUrls: string[];
}

export interface IContentModerationQueue {
    sendMessage(request: ContentModerationRequest): Promise<void>;
}
