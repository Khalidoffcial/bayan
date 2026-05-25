const con = require('../mysqlconnect.js');


function login_user(identifierUser, password) {
    return new Promise((resolve, reject) => {
        const queryString = 'SELECT * FROM user_data WHERE (F_user = ? OR Id_user = ?) AND psw = ?';
        con.query(queryString, [identifierUser, identifierUser, password], (err, results, fields) => {
            if (err) {
                reject(err);
            } else {
                console.log("results " + results);
                resolve(results);
            }
        });
    });
}


function logup_user_check_phone(mail_phone) {
    return new Promise((resolve, reject) => {
        $queryString = `SELECT EXISTS(SELECT * FROM user_data WHERE phoneNumber_mail = ?) AS result;`;

        con.query($queryString, [mail_phone], (err, rows, _fields) => {

            if (err) {
                reject(err);
            }
            resolve(rows);

        });
        // con.end();

    })
};

function logup_user_check_fsp(frist_name, second_name, pws) {
    return new Promise((resolve, reject) => {
        $queryString = `SELECT EXISTS(SELECT * FROM user_data WHERE (F_user = ? AND S_user = ? AND psw)) AS result;`;

        con.query($queryString, [frist_name, second_name, pws], (err, rows, _fields) => {

            if (err) {
                reject(err);
            }
            resolve(rows);

        });
        // con.end();

    })
};

function logup_user_Insert(frist_name, second_name, id_user, password, mail_phone) {
    return new Promise((resolve, reject) => {
        $queryString = `INSERT INTO user_data (F_user, S_user, Id_user, psw, phoneNumber_mail) VALUES (?,?,?,?,?)`;

        con.query($queryString, [frist_name, second_name, id_user, password, mail_phone], (err, rows, _fields) => {

            if (err) {
                reject(err);
            }
            resolve("ok");

        });
        // con.end();

    })
};

function logup_user_Insert_NID(news, img, name, pass) {
    return new Promise((resolve, reject) => {
        $queryString = `UPDATE user_data SET news = ?, img_pro = ? WHERE F_user = ? AND psw = ?`;

        con.query($queryString, [news, img, name, pass], (err, rows, _fields) => {

            if (err) {
                reject(err);
            }
            resolve("inserted in id,news,img");

        });
        // con.end();

    })
}
module.exports = {
    login_user,
    logup_user_Insert,
    logup_user_check_phone,
    logup_user_check_fsp,
    logup_user_Insert_NID

};