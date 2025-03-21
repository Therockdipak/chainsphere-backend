import { ApiResponse } from "../utils/ApiResponse.js";
import { verifyOtpMail } from "../utils/email.js";
import Jwt from "jsonwebtoken";

import prisma from "../DB/config.js";
import bcrypt from "bcrypt";
import Joi from "joi";
import { generateOTP } from "../utils/helpers.js";

const secretKey = process.env.JWT_SECRET_KEY;

export const userLoginHandle = (req, res) => {
  res.send("hello world!");
};

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
        },
      });

      await verifyOtpMail(firstName, email, otp);

      return res
        .status(201)
        .json(new ApiResponse(200, {}, `user created successfully`));
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
    const schema = Joi.object({
      otp: Joi.string().required(),
      email: Joi.string().email().required(),
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

    if (!user) {
      return res
        .status(401)
        .json(new ApiResponse(400, {}, `user does not exists, please signup `));
    }

    if (otp == user.otp) {
      await prisma.user.update({
        where: {
          email,
        },
        data: {
          otp: null,
          isVerified: true,
        },
      });

      return res
        .status(201)
        .json(new ApiResponse(200, {}, `OTP verified successfully`));
    } else {
      return res.status(401).json(new ApiResponse(400, {}, `Invalid OTP`));
    }
  } catch (error) {
    console.log(`error while verifying the otp ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server error`));
  }
};

export const loginHandle = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    const schema = Joi.object({
      email: Joi.string().email().required().messages({
        "any.required": "Email is required",
      }),
      password: Joi.string().min(8).required().messages({
        "string.min": "Password must be at least 8 characters long",
        "any.required": "Password is required",
      }),
      confirmPassword: Joi.string()
        .valid(Joi.ref("password"))
        .required()
        .messages({
          "any.only": "Confirm Password must match Password",
          "any.required": "Confirm Password is required",
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
