const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'tennet',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const createUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUser', inputVars);
}
createUserRef.operationName = 'CreateUser';
exports.createUserRef = createUserRef;

exports.createUser = function createUser(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createUserRef(dcInstance, inputVars));
}
;

const createWalletRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateWallet', inputVars);
}
createWalletRef.operationName = 'CreateWallet';
exports.createWalletRef = createWalletRef;

exports.createWallet = function createWallet(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createWalletRef(dcInstance, inputVars));
}
;

const setWalletBalanceRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SetWalletBalance', inputVars);
}
setWalletBalanceRef.operationName = 'SetWalletBalance';
exports.setWalletBalanceRef = setWalletBalanceRef;

exports.setWalletBalance = function setWalletBalance(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(setWalletBalanceRef(dcInstance, inputVars));
}
;

const insertLedgerEntryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertLedgerEntry', inputVars);
}
insertLedgerEntryRef.operationName = 'InsertLedgerEntry';
exports.insertLedgerEntryRef = insertLedgerEntryRef;

exports.insertLedgerEntry = function insertLedgerEntry(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertLedgerEntryRef(dcInstance, inputVars));
}
;

const updateLedgerEntryStatusRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateLedgerEntryStatus', inputVars);
}
updateLedgerEntryStatusRef.operationName = 'UpdateLedgerEntryStatus';
exports.updateLedgerEntryStatusRef = updateLedgerEntryStatusRef;

exports.updateLedgerEntryStatus = function updateLedgerEntryStatus(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateLedgerEntryStatusRef(dcInstance, inputVars));
}
;

const insertVerificationRecordRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertVerificationRecord', inputVars);
}
insertVerificationRecordRef.operationName = 'InsertVerificationRecord';
exports.insertVerificationRecordRef = insertVerificationRecordRef;

exports.insertVerificationRecord = function insertVerificationRecord(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertVerificationRecordRef(dcInstance, inputVars));
}
;

const getUserByEmailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserByEmail', inputVars);
}
getUserByEmailRef.operationName = 'GetUserByEmail';
exports.getUserByEmailRef = getUserByEmailRef;

exports.getUserByEmail = function getUserByEmail(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getUserByEmailRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getWalletByUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetWalletByUser', inputVars);
}
getWalletByUserRef.operationName = 'GetWalletByUser';
exports.getWalletByUserRef = getWalletByUserRef;

exports.getWalletByUser = function getWalletByUser(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getWalletByUserRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listLedgerForUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListLedgerForUser', inputVars);
}
listLedgerForUserRef.operationName = 'ListLedgerForUser';
exports.listLedgerForUserRef = listLedgerForUserRef;

exports.listLedgerForUser = function listLedgerForUser(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listLedgerForUserRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listVerificationsForUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListVerificationsForUser', inputVars);
}
listVerificationsForUserRef.operationName = 'ListVerificationsForUser';
exports.listVerificationsForUserRef = listVerificationsForUserRef;

exports.listVerificationsForUser = function listVerificationsForUser(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listVerificationsForUserRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;
