import  nodemailer from 'nodemailer'
import hbs from "nodemailer-express-handlebars";

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


var transporter = nodemailer.createTransport({
    // service: 'gmail',
    host: "smtp.gmail.com",
    port: 587,
    // secure: true,
    auth: {
      user: "chainsphere7337@gmail.com",
      pass: "acbprqfsofhvdfbc"
    },
});

const handlebarOptions = {
    viewEngine: {
      extName: '.handlebars',
      partialsDir: join(__dirname, '../view/'),
      layoutsDir: join(__dirname, '../view/'),
      defaultLayout: false,
    },
    viewPath: join(__dirname, '../view/'),
    extName: '.handlebars',
 };
  
transporter.use("compile", hbs(handlebarOptions));

export const verifyOtpMail = async function (name,to, otp){
    let mailOptions = {
        from: "chainsphere7337@gmail.com",
        to: to,
        subject: "Account verification",
        template: "email",
        context: {
            name,
            otp
        },
    };

    // Send email using transporter
    transporter.sendMail(mailOptions, function (err, info) {
        if (err) { // If error occurs while sending email
            console.log("Error -"+ err); // Log the error
        } else { // If email sent successfully
            console.log("Email sent successfully", info.response); // Log the success message with email response info
        }
    });
};