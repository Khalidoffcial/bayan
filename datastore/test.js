const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../store.db');
let sql = `SELECT Data FROM Store_user WHERE Id = ?`;
db.all(sql, ["983905315"], (err, rows) => {
    if (err) {
        reject(err)
    }

    console.log(JSON.parse(rows[0].Data));

    if (typeof rows[0] !== 'undefined') {

    } else {
        console.log('ERROR ... rows undefined');
    }


})