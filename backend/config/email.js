const nodemailer = require('nodemailer');


let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'noreply.advir@gmail.com', // O teu email
        pass: 'ihpgedswadmqtceh',          // A tua senha ou app-specific password
    },
});

module.exports = transporter;
