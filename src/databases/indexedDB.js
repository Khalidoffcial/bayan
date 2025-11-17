import localforage from 'localforage';


export default function indexdb(databaseName, storeName, kind, key, data) {
    localforage.config({
        name: databaseName,
        version: 1,
        storeName: storeName,
    });
    if (kind === "set") {
        localforage.setItem(key, data)
    } else if (kind === "get") {
        return localforage.getItem(key);

    } else if (kind === "delete") {
        localforage.removeItem(key);
        localforage.getDriver()
    }
}