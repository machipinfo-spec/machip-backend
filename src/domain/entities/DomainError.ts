export class DomainError extends Error {
    constructor(message: string, public readonly code?: string) {
        super(message);
        this.name = 'DomainError';
    }
}

export class ValidationError extends DomainError {
    constructor(message: string, public readonly field?: string) {
        super(message, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}
