// Mock uuid FIRST
jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-1234567890ab',
}));

import { RegisterDeviceTokenHandler } from '../post';
import { RegisterDeviceTokenUseCase } from '../../../../../application/usecases/user/RegisterDeviceTokenUseCase';
import { GetUserUseCase } from '../../../../../application/usecases/user/GetUserUseCase';
import { HandlerUtil } from '../../../util';

// Mock dependencies
jest.mock('../../../../../application/usecases/user/RegisterDeviceTokenUseCase');
jest.mock('../../../../../application/usecases/user/GetUserUseCase');
jest.mock('../../../util');

describe('RegisterDeviceToken Handler', () => {
    let mockEvent: any;
    let mockRegisterExecute: jest.Mock;
    let mockGetUserExecute: jest.Mock;
    let mockGetAuthId: jest.Mock;

    let handler: RegisterDeviceTokenHandler;
    let mockHandlerUtil: HandlerUtil;
    let mockGetUserUseCase: GetUserUseCase;
    let mockRegisterDeviceTokenUseCase: RegisterDeviceTokenUseCase;

    beforeEach(() => {
        jest.clearAllMocks();

        mockEvent = {
            httpMethod: 'POST',
            body: JSON.stringify({
                token: 'test-token',
                platform: 'web',
            }),
            headers: {
                Authorization: 'Bearer token',
            },
        };

        mockGetAuthId = jest.fn();
        mockHandlerUtil = { getAuthId: mockGetAuthId } as any;

        mockGetUserExecute = jest.fn();
        mockGetUserUseCase = { execute: mockGetUserExecute } as any;

        mockRegisterExecute = jest.fn();
        mockRegisterDeviceTokenUseCase = { execute: mockRegisterExecute } as any;

        handler = new RegisterDeviceTokenHandler(mockHandlerUtil, mockGetUserUseCase, mockRegisterDeviceTokenUseCase);
    });

    it('should register token successfully', async () => {
        mockGetAuthId.mockResolvedValue('auth-id');
        mockGetUserExecute.mockResolvedValue({ userId: { getValue: () => 'user-id' } });

        const result = await handler.handle(mockEvent);

        expect(result.statusCode).toBe(200);
        expect(mockGetUserExecute).toHaveBeenCalledWith('auth-id');
        expect(mockRegisterExecute).toHaveBeenCalledWith({
            userId: 'user-id',
            token: 'test-token',
            platform: 'web',
        });
    });

    it('should return 401 if unauthorized', async () => {
        mockGetAuthId.mockResolvedValue(null);

        const result = await handler.handle(mockEvent);

        expect(result.statusCode).toBe(401);
    });

    it('should return 404 if user not found', async () => {
        mockGetAuthId.mockResolvedValue('auth-id');
        mockGetUserExecute.mockResolvedValue(null);

        const result = await handler.handle(mockEvent);

        expect(result.statusCode).toBe(404);
    });

    it('should return 400 if body is invalid', async () => {
        mockGetAuthId.mockResolvedValue('auth-id');
        mockEvent.body = null;

        const result = await handler.handle(mockEvent);

        expect(result.statusCode).toBe(400);
    });

    it('should return 500 on internal error', async () => {
        mockGetAuthId.mockResolvedValue('auth-id');
        mockGetUserExecute.mockRejectedValue(new Error('Test error'));

        const result = await handler.handle(mockEvent);

        expect(result.statusCode).toBe(500);
    });
});
