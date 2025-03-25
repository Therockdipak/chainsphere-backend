import crypto from "crypto";


export const generateOTP =()=> {
    const otp = crypto.randomInt(100000, 999999);
    console.log(otp.toString())
    return otp.toString();
}



export const getExpirationTime = () => {
    // console.log(new Date(Date.now() + 5 * 60 * 1000));
    return new Date(Date.now() + 1 * 60 * 1000); // Current time + 5 minutes
};
  

