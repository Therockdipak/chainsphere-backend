import crypto from "crypto";
import { nanoid } from "nanoid";


export const generateOTP =()=> {
    const otp = crypto.randomInt(100000, 999999);
    console.log(otp.toString())
    return otp.toString();
}


export const generateCode = ()=>{
    // console.log(`nano code -------------->`, nanoid(8).toUpperCase());
    return nanoid(8).toUpperCase()
    
}


export const getExpirationTime = () => {
    // console.log(new Date(Date.now() + 5 * 60 * 1000));
    return new Date(Date.now() + 5 * 60 * 1000); // Current time + 5 minutes
};
  

