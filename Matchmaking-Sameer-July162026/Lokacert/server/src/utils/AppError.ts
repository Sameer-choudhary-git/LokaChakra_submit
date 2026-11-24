// utils/AppError.ts
export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // isOperational = true means "we expected this" (e.g., bad user input)
    // isOperational = false means "we crashed" (e.g., database bug)
    this.isOperational = true; 

    Error.captureStackTrace(this, this.constructor);
  }
}