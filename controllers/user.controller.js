import { ApiResponse } from "../utils/ApiResponse.js";
import { verifyOtpMail } from "../utils/email.js";
import Jwt from "jsonwebtoken";

import prisma from "../DB/config.js";
import bcrypt from "bcrypt";
import Joi from "joi";
import { generateOTP, getExpirationTime } from "../utils/helpers.js";

const secretKey = process.env.JWT_SECRET_KEY;

export const userSignupHandle = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      country,
      state,
      city,
      dob,
      address,
      zipCode,
      ibiName,
      ibiId,
    } = req.body;

    const schema = Joi.object({
      firstName: Joi.string().min(2).max(50).required(),
      lastName: Joi.string().min(2).max(50).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      country: Joi.string().min(2).max(50).required(),
      state: Joi.string().min(2).max(50).required(),
      city: Joi.string().min(2).max(50).required(),
      dob: Joi.string().required().messages({
        "date.format": "Date of birth must be in ISO format (DD-MM-YYYY)",
      }),
      address: Joi.string().min(5).max(1000).required(),
      zipCode: Joi.string().required(),

      ibiName: Joi.string().min(2).max(100).required(),
      ibiId: Joi.string().alphanum().min(5).max(20).required().messages({
        "string.alphanum": "IBI ID must contain only letters and numbers",
      }),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return res
        .status(401)
        .json(new ApiResponse(400, {}, error.details[0].message));
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user) {
      return res
        .status(401)
        .json(new ApiResponse(400, {}, `user already exists, please login`));
    } else {
      const otp = generateOTP();
      const expiryTime = getExpirationTime();
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          country,
          state,
          city,
          dob,
          address,
          zipCode,
          ibiName,
          ibiId,
          otp: otp,
          otpExpiresAt: expiryTime,
        },
      });

      await verifyOtpMail(firstName, email, otp);

      return res
        .status(201)
        .json(
          new ApiResponse(
            200,
            {},
            `The OTP has been successfully sent to your registered email address. Please check your inbox`
          )
        );
    }
  } catch (error) {
    console.log(`error while signup ${error}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const verifyOtpHandle = async (req, res) => {
  try {
    const { otp, email } = req.body;

    // Validate request body
    const schema = Joi.object({
      otp: Joi.string().length(6).required(), // Ensuring OTP is 6 digits
      email: Joi.string().email().required(),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, `User does not exist, please sign up`));
    }

    // Check if OTP exists and is not expired
    if (!user.otp || !user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            `OTP is expired or invalid. Please request a new one.`
          )
        );
    }

    // Secure OTP comparison
    if (otp !== user.otp) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, `Invalid OTP. Please try again.`));
    }

    // Update user as verified and clear OTP fields
    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          `OTP verified successfully. Your account is now active.`
        )
      );
  } catch (error) {
    console.error(`Error while verifying OTP:`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const resendOtpHandle = async (req, res) => {
  try {
    const { email } = req.body;
    const schema = Joi.object({
      email: Joi.string().email().required(),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user)
      return res
        .status(401)
        .json(new ApiResponse(400, {}, `Couldn't find user`));

    const otp = generateOTP();
    const expiryOtp = getExpirationTime();

    await prisma.user.update({
      where: { email },
      data: {
        otp: otp,
        otpExpiresAt: expiryOtp,
      },
    });

    await verifyOtpMail(user.firstName, email, otp);

    return res
      .status(201)
      .json(new ApiResponse(200, { otp: otp }, `OTP sent successfully`));
  } catch (error) {
    console.log(`error while resending otp ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server error`));
  }
};

export const loginHandle = async (req, res) => {
  try {
    const { email, password } = req.body;

    const schema = Joi.object({
      email: Joi.string().email().required().messages({
        "any.required": "Email is required",
      }),
      password: Joi.string().min(8).required().messages({
        "string.min": "Password must be at least 8 characters long",
        "any.required": "Password is required",
      }),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return res
        .status(401)
        .json(new ApiResponse(400, {}, error.details[0].message));
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json(new ApiResponse(400, {}, `Invalid login credentials`));
    }

    if (user.isVerified == false) {
      return res
        .status(401)
        .json(new ApiResponse(400, {}, `please verify your account first`));
    } else {
      const token = Jwt.sign(
        { userId: user.id, email: user.email },
        secretKey,
        { expiresIn: "3d" }
      );
      const userResponse = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        country: user.country,
        state: user.state,
        city: user.city,
      };

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { user: userResponse, token: token },
            `user logged in successfully`
          )
        );
    }
  } catch (error) {
    console.log(`error while login ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server error`));
  }
};

export const changePasswordHandle = async (req, res) => {
  try {
    const { email, oldPassword, newPassword, confirmPassword } = req.body;

    // ✅ Validate input
    const schema = Joi.object({
      email: Joi.string().email().required().messages({
        "any.required": "Email is required",
      }),
      oldPassword: Joi.string().min(8).required().messages({
        "string.min": "Old password must be at least 8 characters long",
        "any.required": "Old password is required",
      }),
      newPassword: Joi.string().min(8).required().messages({
        "string.min": "New password must be at least 8 characters long",
        "any.required": "New password is required",
      }),
      confirmPassword: Joi.string()
        .valid(Joi.ref("newPassword"))
        .required()
        .messages({
          "any.only": "Confirm Password must match New Password",
          "any.required": "Confirm Password is required",
        }),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));
    }

    // ✅ Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user)
      return res
        .status(404)
        .json(new ApiResponse(404, {}, `User does not exist`));

    // ✅ Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid)
      return res
        .status(401)
        .json(new ApiResponse(401, {}, `Incorrect old password`));

    // ✅ Prevent reusing the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword)
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            `New password cannot be the same as the old password`
          )
        );

    // ✅ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ✅ Update password in database
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    });

     return res
      .status(200)
      .json(new ApiResponse(200, {}, `Password changed successfully`));
  } catch (error) {
    console.error(`Error while changing password: ${error.message}`);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

// export const forgotPasswordHandle = async (req, res) => {
//   try {
//     const { email, password, confirmPassword } = req.body;
  
//     // ✅ Validate input
//     const schema = Joi.object({
//       email: Joi.string().email().required().messages({
//         "any.required": "Email is required",
//       }),
  
//       password: Joi.string().min(8).required().messages({
//         "string.min": "New password must be at least 8 characters long",
//         "any.required": "New password is required",
//       }),
//       confirmPassword: Joi.string()
//         .valid(Joi.ref("password"))
//         .required()
//         .messages({
//           "any.only": "Confirm Password must match password",
//           "any.required": "Confirm Password is required",
//         }),
//     });
  
//     const { error } = schema.validate(req.body);
//     if (error) {
//       return res
//         .status(400)
//         .json(new ApiResponse(400, {}, error.details[0].message));
//     }
  
//     const user = await prisma.user.findUnique({ where: { email } });
  
//     if (!user)
//       return res
//         .status(404)
//         .json(new ApiResponse(404, {}, `User does not exist`));
  
  
//     const hashedPassword = await bcrypt.hash(password, 10);
//     await prisma.user.update({
//       where:{email},
//       data:{
//         password: hashedPassword
//       }
//     }) 
//   } catch (error) {
//     console.log(`error while forgot password ${error.message}`)
//     return res.status(501).json(new ApiResponse(500, {}, `Internal Server Error`))
//   }
// };
