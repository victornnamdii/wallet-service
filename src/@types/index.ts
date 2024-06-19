export enum transactionType {
  Debit = "debit",
  Credit = "credit",
}

export enum HttpStatusCode {
  OK = 200,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  INTERNAL_SERVER = 500,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403
}

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  bvn: string;
  phoneNumber: string;
  walletId?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type Wallet = {
  id: string;
  userId: string;
  balance: number;
  created_at?: Date;
  updated_at?: Date;
};

export type Transaction = {
  id: string;
  walletId: string;
  amount: number;
  type: transactionType;
  narration: string;
  created_at?: Date;
  updated_at?: Date;
};

export type KnexError = {
  message: string;
  code: string;
  sqlMessage: string;
}
