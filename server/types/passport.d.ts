import { User } from '@shared/schema';

declare global {
  namespace Express {
    interface User extends User {}
    
    interface Request {
      logout(callback: (err?: any) => void): void;
      user?: User;
    }
  }
}

export {};

