/** Mock replacing ./firebaseArticle.js for offline tests. */
const store = {};

const ref = (path) => ({ path });
const set = async (r, value) => { store[r.path] = value; };
const get = async (r) => ({
    exists: () => store[r.path] !== undefined,
    val: () => store[r.path],
});

module.exports = { db: {}, ref, set, get, update: set, child: () => ({}), push: () => ({}), query: () => ({}), equalTo: () => ({}), orderByChild: () => ({}), limitToLast: () => ({}), limitToFirst: () => ({}), runTransaction: async (tref, fn) => fn({}) };
