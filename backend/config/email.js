const nodemailer = require('nodemailer');


let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'no.reply.advirplan@gmail.com', // O teu email
        pass: 'jkma hfwy bkxp dfzk',          // A tua senha ou app-specific password
    },
});

module.exports = transporter;
