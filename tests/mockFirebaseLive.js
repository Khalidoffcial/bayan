/** Shared-state mock replacing datastore/firebase.js for admin auth tests.
 *  Exposes the store so the test can pre-seed admins/sessions. */
const store = require("./mockStore.js");
const ref = (db, path) => ({ path });
const set = async (r, value) => { if (value === null) delete store[r.path]; else store[r.path] = value; };
const get = async (r) => ({
    exists: () => store[r.path] !== undefined,
    val: () => store[r.path],
});
const update = set;
module.exports = {
    db: {},
    store,
    ref, set, get, update,
    child: () => ({}),
    push: (db, path) => ({ path: path + "/p" + Math.random().toString(36).slice(2) }),
    query: (...a) => a[0],
    equalTo: () => ({}),
    orderByChild: () => ({}),
    limitToLast: () => ({}),
    limitToFirst: () => ({}),
    runTransaction: async (tref, fn) => fn({}),
    onValue: () => () => { },
    remove: async (r) => { delete store[r.path]; },
};
