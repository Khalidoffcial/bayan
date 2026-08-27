const con = require('../mysqlconnect.js');

function findbyID(idN) {
    return new Promise((resolve, reject) => {
        let que = 'SELECT F_user,S_user,Username,Id_user,phoneNumber_mail,news,img_pro FROM `user_data` WHERE `Id_user` = ?';
        con.query(que, [idN], function(err, results, fields) {
            if (err) {
                return reject(err);
            };
            resolve(results)
        })



        // let tableName1 = idname + "_" + idnum;


        // let star = `CREATE TABLE ?? (number_massege VARCHAR(255), msg VARCHAR(255), time TIME, type VARCHAR(255))`;


        // con2.query(star, [tableName1], function(err, rows) {
        //     // if (err) throw err;
        //     console.log("Table created");
        // });
        // console.log(idname);
        // console.log("dtSql = " + idnum);


        // const dtA = { 'idN': `${idnum}`, 'idname': `${idname}` };
        // res.send(JSON.stringify(dtA));


    })
};
module.exports = {
    findbyID
};