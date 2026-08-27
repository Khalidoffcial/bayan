const CryptoJS = require('crypto-js');
const secretKey = "@*&%$###&h";


function encryption_$set(data) {
    return new Promise((resolve, reject) => {

        // تحويل البيانات إلى سلسلة نصية JSON
        resolve(data)
    });
}

// فك تشفير البيانات
function decryption_$get(encryptedData) {
    return new Promise((resolve, reject) => {


        resolve(encryptedData);
    });
}


module.exports = {
    encryption_$set,
    decryption_$get
};