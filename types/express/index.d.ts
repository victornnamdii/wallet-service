import "express-serve-static-core";

interface User {
  id: string;
  password?: string;
  bvn: string;
  walletId?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user: User | undefined
  }
}
