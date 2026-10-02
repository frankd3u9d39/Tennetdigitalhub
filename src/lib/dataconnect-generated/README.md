# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `default`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetUserByEmail*](#getuserbyemail)
  - [*GetWalletByUser*](#getwalletbyuser)
  - [*ListLedgerForUser*](#listledgerforuser)
  - [*ListVerificationsForUser*](#listverificationsforuser)
- [**Mutations**](#mutations)
  - [*CreateUser*](#createuser)
  - [*CreateWallet*](#createwallet)
  - [*SetWalletBalance*](#setwalletbalance)
  - [*InsertLedgerEntry*](#insertledgerentry)
  - [*UpdateLedgerEntryStatus*](#updateledgerentrystatus)
  - [*InsertVerificationRecord*](#insertverificationrecord)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `default`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetUserByEmail
You can execute the `GetUserByEmail` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserByEmail(vars: GetUserByEmailVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserByEmailData, GetUserByEmailVariables>;

interface GetUserByEmailRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserByEmailVariables): QueryRef<GetUserByEmailData, GetUserByEmailVariables>;
}
export const getUserByEmailRef: GetUserByEmailRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserByEmail(dc: DataConnect, vars: GetUserByEmailVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserByEmailData, GetUserByEmailVariables>;

interface GetUserByEmailRef {
  ...
  (dc: DataConnect, vars: GetUserByEmailVariables): QueryRef<GetUserByEmailData, GetUserByEmailVariables>;
}
export const getUserByEmailRef: GetUserByEmailRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserByEmailRef:
```typescript
const name = getUserByEmailRef.operationName;
console.log(name);
```

### Variables
The `GetUserByEmail` query requires an argument of type `GetUserByEmailVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserByEmailVariables {
  email: string;
}
```
### Return Type
Recall that executing the `GetUserByEmail` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserByEmailData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetUserByEmail`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserByEmail, GetUserByEmailVariables } from '@dataconnect/generated';

// The `GetUserByEmail` query requires an argument of type `GetUserByEmailVariables`:
const getUserByEmailVars: GetUserByEmailVariables = {
  email: ..., 
};

// Call the `getUserByEmail()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserByEmail(getUserByEmailVars);
// Variables can be defined inline as well.
const { data } = await getUserByEmail({ email: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserByEmail(dataConnect, getUserByEmailVars);

console.log(data.users);

// Or, you can use the `Promise` API.
getUserByEmail(getUserByEmailVars).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

### Using `GetUserByEmail`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserByEmailRef, GetUserByEmailVariables } from '@dataconnect/generated';

// The `GetUserByEmail` query requires an argument of type `GetUserByEmailVariables`:
const getUserByEmailVars: GetUserByEmailVariables = {
  email: ..., 
};

// Call the `getUserByEmailRef()` function to get a reference to the query.
const ref = getUserByEmailRef(getUserByEmailVars);
// Variables can be defined inline as well.
const ref = getUserByEmailRef({ email: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserByEmailRef(dataConnect, getUserByEmailVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.users);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

## GetWalletByUser
You can execute the `GetWalletByUser` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getWalletByUser(vars: GetWalletByUserVariables, options?: ExecuteQueryOptions): QueryPromise<GetWalletByUserData, GetWalletByUserVariables>;

interface GetWalletByUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetWalletByUserVariables): QueryRef<GetWalletByUserData, GetWalletByUserVariables>;
}
export const getWalletByUserRef: GetWalletByUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getWalletByUser(dc: DataConnect, vars: GetWalletByUserVariables, options?: ExecuteQueryOptions): QueryPromise<GetWalletByUserData, GetWalletByUserVariables>;

interface GetWalletByUserRef {
  ...
  (dc: DataConnect, vars: GetWalletByUserVariables): QueryRef<GetWalletByUserData, GetWalletByUserVariables>;
}
export const getWalletByUserRef: GetWalletByUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getWalletByUserRef:
```typescript
const name = getWalletByUserRef.operationName;
console.log(name);
```

### Variables
The `GetWalletByUser` query requires an argument of type `GetWalletByUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetWalletByUserVariables {
  userId: UUIDString;
}
```
### Return Type
Recall that executing the `GetWalletByUser` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetWalletByUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetWalletByUserData {
  wallets: ({
    id: UUIDString;
    balance: number;
  } & Wallet_Key)[];
}
```
### Using `GetWalletByUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getWalletByUser, GetWalletByUserVariables } from '@dataconnect/generated';

// The `GetWalletByUser` query requires an argument of type `GetWalletByUserVariables`:
const getWalletByUserVars: GetWalletByUserVariables = {
  userId: ..., 
};

// Call the `getWalletByUser()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getWalletByUser(getWalletByUserVars);
// Variables can be defined inline as well.
const { data } = await getWalletByUser({ userId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getWalletByUser(dataConnect, getWalletByUserVars);

console.log(data.wallets);

// Or, you can use the `Promise` API.
getWalletByUser(getWalletByUserVars).then((response) => {
  const data = response.data;
  console.log(data.wallets);
});
```

### Using `GetWalletByUser`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getWalletByUserRef, GetWalletByUserVariables } from '@dataconnect/generated';

// The `GetWalletByUser` query requires an argument of type `GetWalletByUserVariables`:
const getWalletByUserVars: GetWalletByUserVariables = {
  userId: ..., 
};

// Call the `getWalletByUserRef()` function to get a reference to the query.
const ref = getWalletByUserRef(getWalletByUserVars);
// Variables can be defined inline as well.
const ref = getWalletByUserRef({ userId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getWalletByUserRef(dataConnect, getWalletByUserVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.wallets);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.wallets);
});
```

## ListLedgerForUser
You can execute the `ListLedgerForUser` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listLedgerForUser(vars: ListLedgerForUserVariables, options?: ExecuteQueryOptions): QueryPromise<ListLedgerForUserData, ListLedgerForUserVariables>;

interface ListLedgerForUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListLedgerForUserVariables): QueryRef<ListLedgerForUserData, ListLedgerForUserVariables>;
}
export const listLedgerForUserRef: ListLedgerForUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listLedgerForUser(dc: DataConnect, vars: ListLedgerForUserVariables, options?: ExecuteQueryOptions): QueryPromise<ListLedgerForUserData, ListLedgerForUserVariables>;

interface ListLedgerForUserRef {
  ...
  (dc: DataConnect, vars: ListLedgerForUserVariables): QueryRef<ListLedgerForUserData, ListLedgerForUserVariables>;
}
export const listLedgerForUserRef: ListLedgerForUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listLedgerForUserRef:
```typescript
const name = listLedgerForUserRef.operationName;
console.log(name);
```

### Variables
The `ListLedgerForUser` query requires an argument of type `ListLedgerForUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListLedgerForUserVariables {
  userId: UUIDString;
  limit: number;
}
```
### Return Type
Recall that executing the `ListLedgerForUser` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListLedgerForUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListLedgerForUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listLedgerForUser, ListLedgerForUserVariables } from '@dataconnect/generated';

// The `ListLedgerForUser` query requires an argument of type `ListLedgerForUserVariables`:
const listLedgerForUserVars: ListLedgerForUserVariables = {
  userId: ..., 
  limit: ..., 
};

// Call the `listLedgerForUser()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listLedgerForUser(listLedgerForUserVars);
// Variables can be defined inline as well.
const { data } = await listLedgerForUser({ userId: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listLedgerForUser(dataConnect, listLedgerForUserVars);

console.log(data.ledgerEntries);

// Or, you can use the `Promise` API.
listLedgerForUser(listLedgerForUserVars).then((response) => {
  const data = response.data;
  console.log(data.ledgerEntries);
});
```

### Using `ListLedgerForUser`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listLedgerForUserRef, ListLedgerForUserVariables } from '@dataconnect/generated';

// The `ListLedgerForUser` query requires an argument of type `ListLedgerForUserVariables`:
const listLedgerForUserVars: ListLedgerForUserVariables = {
  userId: ..., 
  limit: ..., 
};

// Call the `listLedgerForUserRef()` function to get a reference to the query.
const ref = listLedgerForUserRef(listLedgerForUserVars);
// Variables can be defined inline as well.
const ref = listLedgerForUserRef({ userId: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listLedgerForUserRef(dataConnect, listLedgerForUserVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.ledgerEntries);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.ledgerEntries);
});
```

## ListVerificationsForUser
You can execute the `ListVerificationsForUser` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listVerificationsForUser(vars: ListVerificationsForUserVariables, options?: ExecuteQueryOptions): QueryPromise<ListVerificationsForUserData, ListVerificationsForUserVariables>;

interface ListVerificationsForUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListVerificationsForUserVariables): QueryRef<ListVerificationsForUserData, ListVerificationsForUserVariables>;
}
export const listVerificationsForUserRef: ListVerificationsForUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listVerificationsForUser(dc: DataConnect, vars: ListVerificationsForUserVariables, options?: ExecuteQueryOptions): QueryPromise<ListVerificationsForUserData, ListVerificationsForUserVariables>;

interface ListVerificationsForUserRef {
  ...
  (dc: DataConnect, vars: ListVerificationsForUserVariables): QueryRef<ListVerificationsForUserData, ListVerificationsForUserVariables>;
}
export const listVerificationsForUserRef: ListVerificationsForUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listVerificationsForUserRef:
```typescript
const name = listVerificationsForUserRef.operationName;
console.log(name);
```

### Variables
The `ListVerificationsForUser` query requires an argument of type `ListVerificationsForUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListVerificationsForUserVariables {
  userId: UUIDString;
  limit: number;
}
```
### Return Type
Recall that executing the `ListVerificationsForUser` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListVerificationsForUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListVerificationsForUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listVerificationsForUser, ListVerificationsForUserVariables } from '@dataconnect/generated';

// The `ListVerificationsForUser` query requires an argument of type `ListVerificationsForUserVariables`:
const listVerificationsForUserVars: ListVerificationsForUserVariables = {
  userId: ..., 
  limit: ..., 
};

// Call the `listVerificationsForUser()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listVerificationsForUser(listVerificationsForUserVars);
// Variables can be defined inline as well.
const { data } = await listVerificationsForUser({ userId: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listVerificationsForUser(dataConnect, listVerificationsForUserVars);

console.log(data.verificationRecords);

// Or, you can use the `Promise` API.
listVerificationsForUser(listVerificationsForUserVars).then((response) => {
  const data = response.data;
  console.log(data.verificationRecords);
});
```

### Using `ListVerificationsForUser`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listVerificationsForUserRef, ListVerificationsForUserVariables } from '@dataconnect/generated';

// The `ListVerificationsForUser` query requires an argument of type `ListVerificationsForUserVariables`:
const listVerificationsForUserVars: ListVerificationsForUserVariables = {
  userId: ..., 
  limit: ..., 
};

// Call the `listVerificationsForUserRef()` function to get a reference to the query.
const ref = listVerificationsForUserRef(listVerificationsForUserVars);
// Variables can be defined inline as well.
const ref = listVerificationsForUserRef({ userId: ..., limit: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listVerificationsForUserRef(dataConnect, listVerificationsForUserVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.verificationRecords);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.verificationRecords);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateUser
You can execute the `CreateUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createUser(vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
}
export const createUserRef: CreateUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUser(dc: DataConnect, vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateUserRef {
  ...
  (dc: DataConnect, vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
}
export const createUserRef: CreateUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserRef:
```typescript
const name = createUserRef.operationName;
console.log(name);
```

### Variables
The `CreateUser` mutation requires an argument of type `CreateUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateUserVariables {
  name: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  reference?: string | null;
}
```
### Return Type
Recall that executing the `CreateUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserData {
  user_insert: User_Key;
}
```
### Using `CreateUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUser, CreateUserVariables } from '@dataconnect/generated';

// The `CreateUser` mutation requires an argument of type `CreateUserVariables`:
const createUserVars: CreateUserVariables = {
  name: ..., 
  email: ..., 
  phone: ..., // optional
  role: ..., // optional
  reference: ..., // optional
};

// Call the `createUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUser(createUserVars);
// Variables can be defined inline as well.
const { data } = await createUser({ name: ..., email: ..., phone: ..., role: ..., reference: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUser(dataConnect, createUserVars);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
createUser(createUserVars).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

### Using `CreateUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserRef, CreateUserVariables } from '@dataconnect/generated';

// The `CreateUser` mutation requires an argument of type `CreateUserVariables`:
const createUserVars: CreateUserVariables = {
  name: ..., 
  email: ..., 
  phone: ..., // optional
  role: ..., // optional
  reference: ..., // optional
};

// Call the `createUserRef()` function to get a reference to the mutation.
const ref = createUserRef(createUserVars);
// Variables can be defined inline as well.
const ref = createUserRef({ name: ..., email: ..., phone: ..., role: ..., reference: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserRef(dataConnect, createUserVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

## CreateWallet
You can execute the `CreateWallet` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createWallet(vars: CreateWalletVariables): MutationPromise<CreateWalletData, CreateWalletVariables>;

interface CreateWalletRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateWalletVariables): MutationRef<CreateWalletData, CreateWalletVariables>;
}
export const createWalletRef: CreateWalletRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createWallet(dc: DataConnect, vars: CreateWalletVariables): MutationPromise<CreateWalletData, CreateWalletVariables>;

interface CreateWalletRef {
  ...
  (dc: DataConnect, vars: CreateWalletVariables): MutationRef<CreateWalletData, CreateWalletVariables>;
}
export const createWalletRef: CreateWalletRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createWalletRef:
```typescript
const name = createWalletRef.operationName;
console.log(name);
```

### Variables
The `CreateWallet` mutation requires an argument of type `CreateWalletVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateWalletVariables {
  userId: UUIDString;
  balance: number;
}
```
### Return Type
Recall that executing the `CreateWallet` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateWalletData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateWalletData {
  wallet_insert: Wallet_Key;
}
```
### Using `CreateWallet`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createWallet, CreateWalletVariables } from '@dataconnect/generated';

// The `CreateWallet` mutation requires an argument of type `CreateWalletVariables`:
const createWalletVars: CreateWalletVariables = {
  userId: ..., 
  balance: ..., 
};

// Call the `createWallet()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createWallet(createWalletVars);
// Variables can be defined inline as well.
const { data } = await createWallet({ userId: ..., balance: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createWallet(dataConnect, createWalletVars);

console.log(data.wallet_insert);

// Or, you can use the `Promise` API.
createWallet(createWalletVars).then((response) => {
  const data = response.data;
  console.log(data.wallet_insert);
});
```

### Using `CreateWallet`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createWalletRef, CreateWalletVariables } from '@dataconnect/generated';

// The `CreateWallet` mutation requires an argument of type `CreateWalletVariables`:
const createWalletVars: CreateWalletVariables = {
  userId: ..., 
  balance: ..., 
};

// Call the `createWalletRef()` function to get a reference to the mutation.
const ref = createWalletRef(createWalletVars);
// Variables can be defined inline as well.
const ref = createWalletRef({ userId: ..., balance: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createWalletRef(dataConnect, createWalletVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.wallet_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.wallet_insert);
});
```

## SetWalletBalance
You can execute the `SetWalletBalance` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
setWalletBalance(vars: SetWalletBalanceVariables): MutationPromise<SetWalletBalanceData, SetWalletBalanceVariables>;

interface SetWalletBalanceRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: SetWalletBalanceVariables): MutationRef<SetWalletBalanceData, SetWalletBalanceVariables>;
}
export const setWalletBalanceRef: SetWalletBalanceRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
setWalletBalance(dc: DataConnect, vars: SetWalletBalanceVariables): MutationPromise<SetWalletBalanceData, SetWalletBalanceVariables>;

interface SetWalletBalanceRef {
  ...
  (dc: DataConnect, vars: SetWalletBalanceVariables): MutationRef<SetWalletBalanceData, SetWalletBalanceVariables>;
}
export const setWalletBalanceRef: SetWalletBalanceRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the setWalletBalanceRef:
```typescript
const name = setWalletBalanceRef.operationName;
console.log(name);
```

### Variables
The `SetWalletBalance` mutation requires an argument of type `SetWalletBalanceVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SetWalletBalanceVariables {
  walletId: UUIDString;
  balance: number;
}
```
### Return Type
Recall that executing the `SetWalletBalance` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SetWalletBalanceData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SetWalletBalanceData {
  wallet_update?: Wallet_Key | null;
}
```
### Using `SetWalletBalance`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, setWalletBalance, SetWalletBalanceVariables } from '@dataconnect/generated';

// The `SetWalletBalance` mutation requires an argument of type `SetWalletBalanceVariables`:
const setWalletBalanceVars: SetWalletBalanceVariables = {
  walletId: ..., 
  balance: ..., 
};

// Call the `setWalletBalance()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await setWalletBalance(setWalletBalanceVars);
// Variables can be defined inline as well.
const { data } = await setWalletBalance({ walletId: ..., balance: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await setWalletBalance(dataConnect, setWalletBalanceVars);

console.log(data.wallet_update);

// Or, you can use the `Promise` API.
setWalletBalance(setWalletBalanceVars).then((response) => {
  const data = response.data;
  console.log(data.wallet_update);
});
```

### Using `SetWalletBalance`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, setWalletBalanceRef, SetWalletBalanceVariables } from '@dataconnect/generated';

// The `SetWalletBalance` mutation requires an argument of type `SetWalletBalanceVariables`:
const setWalletBalanceVars: SetWalletBalanceVariables = {
  walletId: ..., 
  balance: ..., 
};

// Call the `setWalletBalanceRef()` function to get a reference to the mutation.
const ref = setWalletBalanceRef(setWalletBalanceVars);
// Variables can be defined inline as well.
const ref = setWalletBalanceRef({ walletId: ..., balance: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = setWalletBalanceRef(dataConnect, setWalletBalanceVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.wallet_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.wallet_update);
});
```

## InsertLedgerEntry
You can execute the `InsertLedgerEntry` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertLedgerEntry(vars: InsertLedgerEntryVariables): MutationPromise<InsertLedgerEntryData, InsertLedgerEntryVariables>;

interface InsertLedgerEntryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertLedgerEntryVariables): MutationRef<InsertLedgerEntryData, InsertLedgerEntryVariables>;
}
export const insertLedgerEntryRef: InsertLedgerEntryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertLedgerEntry(dc: DataConnect, vars: InsertLedgerEntryVariables): MutationPromise<InsertLedgerEntryData, InsertLedgerEntryVariables>;

interface InsertLedgerEntryRef {
  ...
  (dc: DataConnect, vars: InsertLedgerEntryVariables): MutationRef<InsertLedgerEntryData, InsertLedgerEntryVariables>;
}
export const insertLedgerEntryRef: InsertLedgerEntryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertLedgerEntryRef:
```typescript
const name = insertLedgerEntryRef.operationName;
console.log(name);
```

### Variables
The `InsertLedgerEntry` mutation requires an argument of type `InsertLedgerEntryVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertLedgerEntryVariables {
  userId: UUIDString;
  label: string;
  detail?: string | null;
  amount: number;
  direction: string;
  status: string;
}
```
### Return Type
Recall that executing the `InsertLedgerEntry` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertLedgerEntryData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertLedgerEntryData {
  ledgerEntry_insert: LedgerEntry_Key;
}
```
### Using `InsertLedgerEntry`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertLedgerEntry, InsertLedgerEntryVariables } from '@dataconnect/generated';

// The `InsertLedgerEntry` mutation requires an argument of type `InsertLedgerEntryVariables`:
const insertLedgerEntryVars: InsertLedgerEntryVariables = {
  userId: ..., 
  label: ..., 
  detail: ..., // optional
  amount: ..., 
  direction: ..., 
  status: ..., 
};

// Call the `insertLedgerEntry()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertLedgerEntry(insertLedgerEntryVars);
// Variables can be defined inline as well.
const { data } = await insertLedgerEntry({ userId: ..., label: ..., detail: ..., amount: ..., direction: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertLedgerEntry(dataConnect, insertLedgerEntryVars);

console.log(data.ledgerEntry_insert);

// Or, you can use the `Promise` API.
insertLedgerEntry(insertLedgerEntryVars).then((response) => {
  const data = response.data;
  console.log(data.ledgerEntry_insert);
});
```

### Using `InsertLedgerEntry`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertLedgerEntryRef, InsertLedgerEntryVariables } from '@dataconnect/generated';

// The `InsertLedgerEntry` mutation requires an argument of type `InsertLedgerEntryVariables`:
const insertLedgerEntryVars: InsertLedgerEntryVariables = {
  userId: ..., 
  label: ..., 
  detail: ..., // optional
  amount: ..., 
  direction: ..., 
  status: ..., 
};

// Call the `insertLedgerEntryRef()` function to get a reference to the mutation.
const ref = insertLedgerEntryRef(insertLedgerEntryVars);
// Variables can be defined inline as well.
const ref = insertLedgerEntryRef({ userId: ..., label: ..., detail: ..., amount: ..., direction: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertLedgerEntryRef(dataConnect, insertLedgerEntryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.ledgerEntry_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.ledgerEntry_insert);
});
```

## UpdateLedgerEntryStatus
You can execute the `UpdateLedgerEntryStatus` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateLedgerEntryStatus(vars: UpdateLedgerEntryStatusVariables): MutationPromise<UpdateLedgerEntryStatusData, UpdateLedgerEntryStatusVariables>;

interface UpdateLedgerEntryStatusRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateLedgerEntryStatusVariables): MutationRef<UpdateLedgerEntryStatusData, UpdateLedgerEntryStatusVariables>;
}
export const updateLedgerEntryStatusRef: UpdateLedgerEntryStatusRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateLedgerEntryStatus(dc: DataConnect, vars: UpdateLedgerEntryStatusVariables): MutationPromise<UpdateLedgerEntryStatusData, UpdateLedgerEntryStatusVariables>;

interface UpdateLedgerEntryStatusRef {
  ...
  (dc: DataConnect, vars: UpdateLedgerEntryStatusVariables): MutationRef<UpdateLedgerEntryStatusData, UpdateLedgerEntryStatusVariables>;
}
export const updateLedgerEntryStatusRef: UpdateLedgerEntryStatusRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateLedgerEntryStatusRef:
```typescript
const name = updateLedgerEntryStatusRef.operationName;
console.log(name);
```

### Variables
The `UpdateLedgerEntryStatus` mutation requires an argument of type `UpdateLedgerEntryStatusVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateLedgerEntryStatusVariables {
  id: UUIDString;
  status: string;
}
```
### Return Type
Recall that executing the `UpdateLedgerEntryStatus` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateLedgerEntryStatusData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateLedgerEntryStatusData {
  ledgerEntry_update?: LedgerEntry_Key | null;
}
```
### Using `UpdateLedgerEntryStatus`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateLedgerEntryStatus, UpdateLedgerEntryStatusVariables } from '@dataconnect/generated';

// The `UpdateLedgerEntryStatus` mutation requires an argument of type `UpdateLedgerEntryStatusVariables`:
const updateLedgerEntryStatusVars: UpdateLedgerEntryStatusVariables = {
  id: ..., 
  status: ..., 
};

// Call the `updateLedgerEntryStatus()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateLedgerEntryStatus(updateLedgerEntryStatusVars);
// Variables can be defined inline as well.
const { data } = await updateLedgerEntryStatus({ id: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateLedgerEntryStatus(dataConnect, updateLedgerEntryStatusVars);

console.log(data.ledgerEntry_update);

// Or, you can use the `Promise` API.
updateLedgerEntryStatus(updateLedgerEntryStatusVars).then((response) => {
  const data = response.data;
  console.log(data.ledgerEntry_update);
});
```

### Using `UpdateLedgerEntryStatus`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateLedgerEntryStatusRef, UpdateLedgerEntryStatusVariables } from '@dataconnect/generated';

// The `UpdateLedgerEntryStatus` mutation requires an argument of type `UpdateLedgerEntryStatusVariables`:
const updateLedgerEntryStatusVars: UpdateLedgerEntryStatusVariables = {
  id: ..., 
  status: ..., 
};

// Call the `updateLedgerEntryStatusRef()` function to get a reference to the mutation.
const ref = updateLedgerEntryStatusRef(updateLedgerEntryStatusVars);
// Variables can be defined inline as well.
const ref = updateLedgerEntryStatusRef({ id: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateLedgerEntryStatusRef(dataConnect, updateLedgerEntryStatusVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.ledgerEntry_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.ledgerEntry_update);
});
```

## InsertVerificationRecord
You can execute the `InsertVerificationRecord` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertVerificationRecord(vars: InsertVerificationRecordVariables): MutationPromise<InsertVerificationRecordData, InsertVerificationRecordVariables>;

interface InsertVerificationRecordRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertVerificationRecordVariables): MutationRef<InsertVerificationRecordData, InsertVerificationRecordVariables>;
}
export const insertVerificationRecordRef: InsertVerificationRecordRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertVerificationRecord(dc: DataConnect, vars: InsertVerificationRecordVariables): MutationPromise<InsertVerificationRecordData, InsertVerificationRecordVariables>;

interface InsertVerificationRecordRef {
  ...
  (dc: DataConnect, vars: InsertVerificationRecordVariables): MutationRef<InsertVerificationRecordData, InsertVerificationRecordVariables>;
}
export const insertVerificationRecordRef: InsertVerificationRecordRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertVerificationRecordRef:
```typescript
const name = insertVerificationRecordRef.operationName;
console.log(name);
```

### Variables
The `InsertVerificationRecord` mutation requires an argument of type `InsertVerificationRecordVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertVerificationRecordVariables {
  userId: UUIDString;
  type: string;
  queried: string;
  subjectName?: string | null;
  status: string;
  cost: number;
}
```
### Return Type
Recall that executing the `InsertVerificationRecord` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertVerificationRecordData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertVerificationRecordData {
  verificationRecord_insert: VerificationRecord_Key;
}
```
### Using `InsertVerificationRecord`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertVerificationRecord, InsertVerificationRecordVariables } from '@dataconnect/generated';

// The `InsertVerificationRecord` mutation requires an argument of type `InsertVerificationRecordVariables`:
const insertVerificationRecordVars: InsertVerificationRecordVariables = {
  userId: ..., 
  type: ..., 
  queried: ..., 
  subjectName: ..., // optional
  status: ..., 
  cost: ..., 
};

// Call the `insertVerificationRecord()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertVerificationRecord(insertVerificationRecordVars);
// Variables can be defined inline as well.
const { data } = await insertVerificationRecord({ userId: ..., type: ..., queried: ..., subjectName: ..., status: ..., cost: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertVerificationRecord(dataConnect, insertVerificationRecordVars);

console.log(data.verificationRecord_insert);

// Or, you can use the `Promise` API.
insertVerificationRecord(insertVerificationRecordVars).then((response) => {
  const data = response.data;
  console.log(data.verificationRecord_insert);
});
```

### Using `InsertVerificationRecord`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertVerificationRecordRef, InsertVerificationRecordVariables } from '@dataconnect/generated';

// The `InsertVerificationRecord` mutation requires an argument of type `InsertVerificationRecordVariables`:
const insertVerificationRecordVars: InsertVerificationRecordVariables = {
  userId: ..., 
  type: ..., 
  queried: ..., 
  subjectName: ..., // optional
  status: ..., 
  cost: ..., 
};

// Call the `insertVerificationRecordRef()` function to get a reference to the mutation.
const ref = insertVerificationRecordRef(insertVerificationRecordVars);
// Variables can be defined inline as well.
const ref = insertVerificationRecordRef({ userId: ..., type: ..., queried: ..., subjectName: ..., status: ..., cost: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertVerificationRecordRef(dataConnect, insertVerificationRecordVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.verificationRecord_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.verificationRecord_insert);
});
```

