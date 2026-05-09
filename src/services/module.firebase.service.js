/* Modules are an API-only feature — there is no Firestore equivalent.
   These stubs exist so the service dispatcher pattern (api/firebase
   facade in module.service.js) keeps a uniform interface. If the app is
   ever run against the legacy Firebase backend, modules quietly return
   empty data instead of throwing. */

const noop = () => () => {};

export const listenToProjectModules = (_projectId, callback) => {
  callback?.([]);
  return noop();
};

export const listenToAllModules = (_filters, callback) => {
  callback?.([]);
  return noop();
};

export const listenToMyModules = (callback) => {
  callback?.([]);
  return noop();
};

export const getModule = async () => null;

export const createModule = async () => {
  throw new Error("Modules are not available on the Firebase backend.");
};

export const updateModule = async () => {
  throw new Error("Modules are not available on the Firebase backend.");
};

export const deleteModule = async () => {
  throw new Error("Modules are not available on the Firebase backend.");
};
