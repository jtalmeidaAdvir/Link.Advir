const nodemailer = require('nodemailer');


let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'adviremailtestes@gmail.com', // O teu email
        pass: 'hpfdapdpacvcdnks',          // A tua senha ou app-specific password
    },
});

module.exports = transporter;
