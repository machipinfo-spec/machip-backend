// Mock uuid FIRST to avoid ESM issues
jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-1234567890ab',
}));

import { DeleteDeviceTokenHandler } from '../delete';
import { DeleteDeviceTokenUseCase } from '../../../../../application/usecases/user/DeleteDeviceTokenUseCase';
import { HandlerUtil } from '../../../util';

// Mock dependencies
jest.mock('../../../../../application/usecases/user/DeleteDeviceTokenUseCase');
jest.mock('../../../util');

describe('DeleteDeviceToken Handler', () => {
    let mockEvent: any;
    let mockExecute: jest.Mock;
    let mockGetAuthId: jest.Mock;

    let handler: DeleteDeviceTokenHandler;
    let mockHandlerUtil: HandlerUtil;
    let mockDeleteDeviceTokenUseCase: DeleteDeviceTokenUseCase;

    beforeEach(() => {
        jest.clearAllMocks();

        mockEvent = {
            httpMethod: 'DELETE',
            queryStringParameters: {
                token: 'test-token',
            },
            headers: {
                Authorization: 'Bearer token',
            },
        };

        mockGetAuthId = jest.fn();
        mockHandlerUtil = { getAuthId: mockGetAuthId } as any;

        mockExecute = jest.fn();
        mockDeleteDeviceTokenUseCase = { execute: mockExecute } as any;

        handler = new DeleteDeviceTokenHandler(mockHandlerUtil, mockDeleteDeviceTokenUseCase);
    });

    it('should delete token successfully via query param', async () => {
        mockGetAuthId.mockResolvedValue('auth-id');

        const result = await handler.handle(mockEvent);

        expect(result.statusCode).toBe(200);
        expect(mockExecute).toHaveBeenCalledWith('test-token');
    });

    it('should delete token successfully via body', async () => {
        mockGetAuthId.mockResolvedValue('auth-id');
        mockEvent.queryStringParameters = null;
        mockEvent.body = JSON.stringify({ token: 'body-token' });

        const result = await handler.handle(mockEvent);

        expect(result.statusCode).toBe(200);
        expect(mockExecute).toHaveBeenCalledWith('body-token');
    });

    it('should return 401 if unauthorized', async () => {
        mockGetAuthId.mockResolvedValue(null);

        const result = await handler.handle(mockEvent);

        expect(result.statusCode).toBe(401);
    });

    it('should return 400 if token missing', async () => {
        mockGetAuthId.mockResolvedValue('auth-id');
        mockEvent.queryStringParameters = null;
        mockEvent.body = null;

        const result = await handler.handle(mockEvent);

        expect(result.statusCode).toBe(400);
    });

    it('should return 500 on internal error', async () => {
        mockGetAuthId.mockResolvedValue('auth-id');
        // Type assertion needed because execute returns Promise<void> but we want to reject
        (mockExecute as jest.Mock).mockRejectedValue(new Error('Test error'));

        const result = await handler.handle(mockEvent);

        expect(result.statusCode).toBe(500);
    });
});
