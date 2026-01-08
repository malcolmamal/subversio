import { errorMiddleware } from './error.middleware';
import { Request, Response } from 'express';

describe('errorMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: any;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  it('should handle error with custom status', () => {
    const err = { status: 400, message: 'Bad Request' };
    errorMiddleware(err, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Bad Request',
      status: 400,
    });
  });

  it('should fallback to 500 status', () => {
    const err = new Error('Generic Error');
    errorMiddleware(err, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Generic Error',
        status: 500,
      }),
    );
  });
});
