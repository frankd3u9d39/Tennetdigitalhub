# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createUser, createWallet, setWalletBalance, insertLedgerEntry, updateLedgerEntryStatus, insertVerificationRecord, getUserByEmail, getWalletByUser, listLedgerForUser, listVerificationsForUser } from '@dataconnect/generated';


// Operation CreateUser:  For variables, look at type CreateUserVars in ../index.d.ts
const { data } = await CreateUser(dataConnect, createUserVars);

// Operation CreateWallet:  For variables, look at type CreateWalletVars in ../index.d.ts
const { data } = await CreateWallet(dataConnect, createWalletVars);

// Operation SetWalletBalance:  For variables, look at type SetWalletBalanceVars in ../index.d.ts
const { data } = await SetWalletBalance(dataConnect, setWalletBalanceVars);

// Operation InsertLedgerEntry:  For variables, look at type InsertLedgerEntryVars in ../index.d.ts
const { data } = await InsertLedgerEntry(dataConnect, insertLedgerEntryVars);

// Operation UpdateLedgerEntryStatus:  For variables, look at type UpdateLedgerEntryStatusVars in ../index.d.ts
const { data } = await UpdateLedgerEntryStatus(dataConnect, updateLedgerEntryStatusVars);

// Operation InsertVerificationRecord:  For variables, look at type InsertVerificationRecordVars in ../index.d.ts
const { data } = await InsertVerificationRecord(dataConnect, insertVerificationRecordVars);

// Operation GetUserByEmail:  For variables, look at type GetUserByEmailVars in ../index.d.ts
const { data } = await GetUserByEmail(dataConnect, getUserByEmailVars);

// Operation GetWalletByUser:  For variables, look at type GetWalletByUserVars in ../index.d.ts
const { data } = await GetWalletByUser(dataConnect, getWalletByUserVars);

// Operation ListLedgerForUser:  For variables, look at type ListLedgerForUserVars in ../index.d.ts
const { data } = await ListLedgerForUser(dataConnect, listLedgerForUserVars);

// Operation ListVerificationsForUser:  For variables, look at type ListVerificationsForUserVars in ../index.d.ts
const { data } = await ListVerificationsForUser(dataConnect, listVerificationsForUserVars);


```