/** Stub for 'firebase/database' in admin tests — delegates to the shared mock. */
const mock = require("../datastore/firebase.js");
module.exports = {
    ref: (dbOrPath, maybePath) => mock.ref(null, maybePath != null ? maybePath : dbOrPath),
    get: mock.get,
    set: mock.set,
    update: mock.update,
    push: mock.push,
    remove: mock.remove,
    child: mock.child,
    query: mock.query,
    equalTo: mock.equalTo,
    orderByChild: mock.orderByChild,
    runTransaction: mock.runTransaction,
    onValue: () => () => { },
};
