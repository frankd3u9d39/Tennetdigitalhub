import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface CreateUserData {
  user_insert: User_Key;
}

export interface CreateUserVariables {
  name: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  reference?: string | null;
}

export interface CreateWalletData {
  wallet_insert: Wallet_Key;
}

export interface CreateWalletVariables {
  userId: UUIDString;
  balance: number;
}

export interface GetUserByEmailData {
  users: ({
    id: UUIDString;
    name: string;
    email: string;
    phone?: string | null;
    role?: string | null;
    reference?: string | null;
    memberSince?: DateString | null;
  } & User_Key)[];
}

export interface GetUserByEmailVariables {
  email: string;
}

export interface GetWalletByUserData {
  wallets: ({
    id: UUIDString;
    balance: number;
  } & Wallet_Key)[];
}

export interface GetWalletByUserVariables {
  userId: UUIDString;
}

export interface InsertLedgerEntryData {
  ledgerEntry_insert: LedgerEntry_Key;
}

export interface InsertLedgerEntryVariables {
  userId: UUIDString;
  label: string;
  detail?: string | null;
  amount: number;
  direction: string;
  status: string;
}

export interface InsertVerificationRecordData {
  verificationRecord_insert: VerificationRecord_Key;
}

export interface InsertVerificationRecordVariables {
  userId: UUIDString;
  type: string;
  queried: string;
  subjectName?: string | null;
  status: string;
  cost: number;
}

export interface LedgerEntry_Key {
  id: UUIDString;
  __typename?: 'LedgerEntry_Key';
}

export interface ListLedgerForUserData {
  ledgerEntries: ({
    id: UUIDString;
    label: string;
    detail?: string | null;
    amount: number;
    direction: string;
    status: string;
    createdAt: TimestampString;
  } & LedgerEntry_Key)[];
}

export interface ListLedgerForUserVariables {
  userId: UUIDString;
  limit: number;
}

export interface ListVerificationsForUserData {
  verificationRecords: ({
    id: UUIDString;
    type: string;
    queried: string;
    subjectName?: string | null;
    status: string;
    cost: number;
    createdAt: TimestampString;
  } & VerificationRecord_Key)[];
}

export interface ListVerificationsForUserVariables {
  userId: UUIDString;
  limit: number;
}

export interface SetWalletBalanceData {
  wallet_update?: Wallet_Key | null;
}

export interface SetWalletBalanceVariables {
  walletId: UUIDString;
  balance: number;
}

export interface UpdateLedgerEntryStatusData {
  ledgerEntry_update?: LedgerEntry_Key | null;
}

export interface UpdateLedgerEntryStatusVariables {
  id: UUIDString;
  status: string;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface VerificationRecord_Key {
  id: UUIDString;
  __typename?: 'VerificationRecord_Key';
}

export interface Wallet_Key {
  id: UUIDString;
  __typename?: 'Wallet_Key';
}

/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to execute without passing in DataConnect. */
export function createUser(dc: DataConnect, vars: CreateUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;
/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to pass in custom DataConnect instances. */
export function createUser(vars: CreateUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;

/** Generated Node Admin SDK operation action function for the 'CreateWallet' Mutation. Allow users to execute without passing in DataConnect. */
export function createWallet(dc: DataConnect, vars: CreateWalletVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateWalletData>>;
/** Generated Node Admin SDK operation action function for the 'CreateWallet' Mutation. Allow users to pass in custom DataConnect instances. */
export function createWallet(vars: CreateWalletVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateWalletData>>;

/** Generated Node Admin SDK operation action function for the 'SetWalletBalance' Mutation. Allow users to execute without passing in DataConnect. */
export function setWalletBalance(dc: DataConnect, vars: SetWalletBalanceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetWalletBalanceData>>;
/** Generated Node Admin SDK operation action function for the 'SetWalletBalance' Mutation. Allow users to pass in custom DataConnect instances. */
export function setWalletBalance(vars: SetWalletBalanceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetWalletBalanceData>>;

/** Generated Node Admin SDK operation action function for the 'InsertLedgerEntry' Mutation. Allow users to execute without passing in DataConnect. */
export function insertLedgerEntry(dc: DataConnect, vars: InsertLedgerEntryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<InsertLedgerEntryData>>;
/** Generated Node Admin SDK operation action function for the 'InsertLedgerEntry' Mutation. Allow users to pass in custom DataConnect instances. */
export function insertLedgerEntry(vars: InsertLedgerEntryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<InsertLedgerEntryData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateLedgerEntryStatus' Mutation. Allow users to execute without passing in DataConnect. */
export function updateLedgerEntryStatus(dc: DataConnect, vars: UpdateLedgerEntryStatusVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateLedgerEntryStatusData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateLedgerEntryStatus' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateLedgerEntryStatus(vars: UpdateLedgerEntryStatusVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateLedgerEntryStatusData>>;

/** Generated Node Admin SDK operation action function for the 'InsertVerificationRecord' Mutation. Allow users to execute without passing in DataConnect. */
export function insertVerificationRecord(dc: DataConnect, vars: InsertVerificationRecordVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<InsertVerificationRecordData>>;
/** Generated Node Admin SDK operation action function for the 'InsertVerificationRecord' Mutation. Allow users to pass in custom DataConnect instances. */
export function insertVerificationRecord(vars: InsertVerificationRecordVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<InsertVerificationRecordData>>;

/** Generated Node Admin SDK operation action function for the 'GetUserByEmail' Query. Allow users to execute without passing in DataConnect. */
export function getUserByEmail(dc: DataConnect, vars: GetUserByEmailVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserByEmailData>>;
/** Generated Node Admin SDK operation action function for the 'GetUserByEmail' Query. Allow users to pass in custom DataConnect instances. */
export function getUserByEmail(vars: GetUserByEmailVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserByEmailData>>;

/** Generated Node Admin SDK operation action function for the 'GetWalletByUser' Query. Allow users to execute without passing in DataConnect. */
export function getWalletByUser(dc: DataConnect, vars: GetWalletByUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetWalletByUserData>>;
/** Generated Node Admin SDK operation action function for the 'GetWalletByUser' Query. Allow users to pass in custom DataConnect instances. */
export function getWalletByUser(vars: GetWalletByUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetWalletByUserData>>;

/** Generated Node Admin SDK operation action function for the 'ListLedgerForUser' Query. Allow users to execute without passing in DataConnect. */
export function listLedgerForUser(dc: DataConnect, vars: ListLedgerForUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListLedgerForUserData>>;
/** Generated Node Admin SDK operation action function for the 'ListLedgerForUser' Query. Allow users to pass in custom DataConnect instances. */
export function listLedgerForUser(vars: ListLedgerForUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListLedgerForUserData>>;

/** Generated Node Admin SDK operation action function for the 'ListVerificationsForUser' Query. Allow users to execute without passing in DataConnect. */
export function listVerificationsForUser(dc: DataConnect, vars: ListVerificationsForUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListVerificationsForUserData>>;
/** Generated Node Admin SDK operation action function for the 'ListVerificationsForUser' Query. Allow users to pass in custom DataConnect instances. */
export function listVerificationsForUser(vars: ListVerificationsForUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListVerificationsForUserData>>;

