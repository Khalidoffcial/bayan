// Preload hook: redirects RTDB modules to the shared mock (seeded store).
const Module = require("module");
const path = require("path");
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
    if (request.endsWith("datastore/firebase")) return path.join(__dirname, "mockFirebase.js");
    if (request.endsWith("datastore/firebaseArticle")) return path.join(__dirname, "mockFirebase.js");
    return orig.call(this, request, ...rest);
};
