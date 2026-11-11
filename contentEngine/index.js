/**
 * contentEngine/index.js — clean public surface of the Bayan Content Engine.
 */

const engine = require("./engine");
const queue = require("./queue");
const config = require("./config");
const categories = require("./categories");
const personas = require("./personas");
const discovery = require("./discovery");
const generator = require("./generator");
const quality = require("./quality");
const publisher = require("./publisher");
const adminRoutes = require("./adminRoutes");

module.exports = {
    engine, queue, config, categories, personas,
    discovery, generator, quality, publisher, adminRoutes,
};
