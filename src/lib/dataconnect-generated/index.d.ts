import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

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

interface CreateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  operationName: string;
}
export const createUserRef: CreateUserRef;

export function createUser(vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;
export function createUser(dc: DataConnect, vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateWalletRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateWalletVariables): MutationRef<CreateWalletData, CreateWalletVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateWalletVariables): MutationRef<CreateWalletData, CreateWalletVariables>;
  operationName: string;
}
export const createWalletRef: CreateWalletRef;

export function createWallet(vars: CreateWalletVariables): MutationPromise<CreateWalletData, CreateWalletVariables>;
export function createWallet(dc: DataConnect, vars: CreateWalletVariables): MutationPromise<CreateWalletData, CreateWalletVariables>;

interface SetWalletBalanceRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: SetWalletBalanceVariables): MutationRef<SetWalletBalanceData, SetWalletBalanceVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: SetWalletBalanceVariables): MutationRef<SetWalletBalanceData, SetWalletBalanceVariables>;
  operationName: string;
}
export const setWalletBalanceRef: SetWalletBalanceRef;

export function setWalletBalance(vars: SetWalletBalanceVariables): MutationPromise<SetWalletBalanceData, SetWalletBalanceVariables>;
export function setWalletBalance(dc: DataConnect, vars: SetWalletBalanceVariables): MutationPromise<SetWalletBalanceData, SetWalletBalanceVariables>;

interface InsertLedgerEntryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertLedgerEntryVariables): MutationRef<InsertLedgerEntryData, InsertLedgerEntryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertLedgerEntryVariables): MutationRef<InsertLedgerEntryData, InsertLedgerEntryVariables>;
  operationName: string;
}
export const insertLedgerEntryRef: InsertLedgerEntryRef;

export function insertLedgerEntry(vars: InsertLedgerEntryVariables): MutationPromise<InsertLedgerEntryData, InsertLedgerEntryVariables>;
export function insertLedgerEntry(dc: DataConnect, vars: InsertLedgerEntryVariables): MutationPromise<InsertLedgerEntryData, InsertLedgerEntryVariables>;

interface UpdateLedgerEntryStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateLedgerEntryStatusVariables): MutationRef<UpdateLedgerEntryStatusData, UpdateLedgerEntryStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateLedgerEntryStatusVariables): MutationRef<UpdateLedgerEntryStatusData, UpdateLedgerEntryStatusVariables>;
  operationName: string;
}
export const updateLedgerEntryStatusRef: UpdateLedgerEntryStatusRef;

export function updateLedgerEntryStatus(vars: UpdateLedgerEntryStatusVariables): MutationPromise<UpdateLedgerEntryStatusData, UpdateLedgerEntryStatusVariables>;
export function updateLedgerEntryStatus(dc: DataConnect, vars: UpdateLedgerEntryStatusVariables): MutationPromise<UpdateLedgerEntryStatusData, UpdateLedgerEntryStatusVariables>;

interface InsertVerificationRecordRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertVerificationRecordVariables): MutationRef<InsertVerificationRecordData, InsertVerificationRecordVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertVerificationRecordVariables): MutationRef<InsertVerificationRecordData, InsertVerificationRecordVariables>;
  operationName: string;
}
export const insertVerificationRecordRef: InsertVerificationRecordRef;

export function insertVerificationRecord(vars: InsertVerificationRecordVariables): MutationPromise<InsertVerificationRecordData, InsertVerificationRecordVariables>;
export function insertVerificationRecord(dc: DataConnect, vars: InsertVerificationRecordVariables): MutationPromise<InsertVerificationRecordData, InsertVerificationRecordVariables>;

interface GetUserByEmailRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserByEmailVariables): QueryRef<GetUserByEmailData, GetUserByEmailVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserByEmailVariables): QueryRef<GetUserByEmailData, GetUserByEmailVariables>;
  operationName: string;
}
export const getUserByEmailRef: GetUserByEmailRef;

export function getUserByEmail(vars: GetUserByEmailVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserByEmailData, GetUserByEmailVariables>;
export function getUserByEmail(dc: DataConnect, vars: GetUserByEmailVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserByEmailData, GetUserByEmailVariables>;

interface GetWalletByUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetWalletByUserVariables): QueryRef<GetWalletByUserData, GetWalletByUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetWalletByUserVariables): QueryRef<GetWalletByUserData, GetWalletByUserVariables>;
  operationName: string;
}
export const getWalletByUserRef: GetWalletByUserRef;

export function getWalletByUser(vars: GetWalletByUserVariables, options?: ExecuteQueryOptions): QueryPromise<GetWalletByUserData, GetWalletByUserVariables>;
export function getWalletByUser(dc: DataConnect, vars: GetWalletByUserVariables, options?: ExecuteQueryOptions): QueryPromise<GetWalletByUserData, GetWalletByUserVariables>;

interface ListLedgerForUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListLedgerForUserVariables): QueryRef<ListLedgerForUserData, ListLedgerForUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListLedgerForUserVariables): QueryRef<ListLedgerForUserData, ListLedgerForUserVariables>;
  operationName: string;
}
export const listLedgerForUserRef: ListLedgerForUserRef;

export function listLedgerForUser(vars: ListLedgerForUserVariables, options?: ExecuteQueryOptions): QueryPromise<ListLedgerForUserData, ListLedgerForUserVariables>;
export function listLedgerForUser(dc: DataConnect, vars: ListLedgerForUserVariables, options?: ExecuteQueryOptions): QueryPromise<ListLedgerForUserData, ListLedgerForUserVariables>;

interface ListVerificationsForUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListVerificationsForUserVariables): QueryRef<ListVerificationsForUserData, ListVerificationsForUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListVerificationsForUserVariables): QueryRef<ListVerificationsForUserData, ListVerificationsForUserVariables>;
  operationName: string;
}
export const listVerificationsForUserRef: ListVerificationsForUserRef;

export function listVerificationsForUser(vars: ListVerificationsForUserVariables, options?: ExecuteQueryOptions): QueryPromise<ListVerificationsForUserData, ListVerificationsForUserVariables>;
export function listVerificationsForUser(dc: DataConnect, vars: ListVerificationsForUserVariables, options?: ExecuteQueryOptions): QueryPromise<ListVerificationsForUserData, ListVerificationsForUserVariables>;

