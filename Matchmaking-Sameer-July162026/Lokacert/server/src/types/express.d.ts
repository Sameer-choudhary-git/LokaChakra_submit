import 'express';
import jwt from 'jsonwebtoken';

declare module 'express' {
  export interface Request {
    user?: jwt.JwtPayload | string; // Add the `user` property to the Request interface
  }
}
