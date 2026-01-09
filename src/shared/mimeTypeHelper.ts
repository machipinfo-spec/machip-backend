export class MimeTypeHelper {
    private static readonly mimeToExt: { [key: string]: string } = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
    };

    /**
     * Get file extension from MIME type.
     * Defaults to 'png' if not found.
     */
    static getExtension(mimeType: string): string {
        return this.mimeToExt[mimeType.toLowerCase()] || 'png';
    }

    /**
     * Extract MIME type from Base64 string prefix (e.g. data:image/jpeg;base64,...)
     */
    static extractMimeTypeFromBase64(base64String: string): string | null {
        const match = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
        return match ? match[1] : null;
    }
}
