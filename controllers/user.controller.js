import { ApiResponse } from "../utils/ApiResponse.js";
import { verifyOtpMail } from "../utils/email.js";
import Jwt from "jsonwebtoken";

import prisma from "../DB/config.js";
import bcrypt from "bcrypt";
import Joi from "joi";
import {
  generateOTP,
  getExpirationTime,
  generateCode,
} from "../utils/helpers.js";

import { contractInstance } from "../Web3/Provider/provider.js";

const baseUrl = process.env.BASE_URL;
const liveBaseUrl = process.env.CHAINSPHERE_URL;
const secretKey = process.env.JWT_SECRET_KEY;

// Helper function to find the root user (the first user in the referral tree)
const findRootUser = async (userId) => {
  let currentUser = await prisma.referral.findUnique({
    where: { referredId: userId },
    include: { referrer: true },
  });

  while (currentUser && currentUser.referrer) {
    currentUser = await prisma.referral.findUnique({
      where: { referredId: currentUser.referrer.id },
      include: { referrer: true },
    });

    if (!currentUser || !currentUser.referrer) {
      return currentUser?.referrer || null; // Root user found (no more referrer above)
    }
  }

  return null;
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
  
      referralCode, // 👈 Accept referral code if provided
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
    
      referralCode: Joi.string().allow("").optional(),
    });

    console.log(`req.body ---------->`, req.body);

    const { error } = schema.validate(req.body);

    if (error) {
      return res
        .status(401)
        .json(new ApiResponse(400, {}, error.details[0].message));
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(401)
        .json(new ApiResponse(400, {}, `User already exists, please login`));
    }

    // Generate OTP & Hash Password
    const otp = generateOTP();
    const expiryTime = getExpirationTime();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique referral code
    const newReferralCode = generateCode(); // 👈 Function to generate a unique referral code

    // Create new user
    const newUser = await prisma.user.create({
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
        otp,
        otpExpiresAt: expiryTime,
        referralCode: newReferralCode,
      },
    });

    // Handle Referral Logic
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
      });

      if (referrer) {
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: newUser.id,
          },
        });
      }
    }

    // Send OTP Email
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
  } catch (error) {
    console.log(`Error while signup: ${error.message}`);
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

    console.log(user.otp, user.otpExpiresAt, new Date());
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
        referralCode: user.referralCode,
        walletAddress: user.walletAddress,
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
    const { email, password, confirmPassword } = req.body;

    console.log(`req.body ------------>`, req.body);
    

    // ✅ Validate input
    const schema = Joi.object({
      email: Joi.string().required().messages({
        "any.required": "Email is required",
      }),

      password: Joi.string().min(8).required().messages({
        "string.min": "New password must be at least 8 characters long",
        "any.required": "New password is required",
      }),
      confirmPassword: Joi.string()
        .valid(Joi.ref("password"))
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

    // ✅ Is Same Password
    const isSamePassword = await bcrypt.compare(password, user.password);

    if (isSamePassword)
      return res
        .status(401)
        .json(
          new ApiResponse(
            400,
            {},
            `old password and new password must be different`
          )
        );

    // ✅ Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

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

export const forgotPasswordHandle = async (req, res) => {
  try {
    const { email } = req.body;

    // ✅ Validate input
    const schema = Joi.object({
      email: Joi.string().email().required().messages({
        "any.required": "Email is required",
      }),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user)
      return res
        .status(404)
        .json(new ApiResponse(404, {}, `User does not exist`));

    const otp = generateOTP();
    const expiryTime = getExpirationTime();
    await prisma.user.update({
      where: { email },
      data: {
        otp: otp,
        otpExpiresAt: expiryTime,
      },
    });

    await verifyOtpMail(user.firstName, email, otp);
    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          {},
          `The OTP has been successfully sent to your registered email address. Please check your inbox `
        )
      );
  } catch (error) {
    console.log(`error while forgot password ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const myProfileHandle = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    console.log("user -------------->", user);

    if (!user)
      return res
        .status(404)
        .json(new ApiResponse(400, {}, `User does not exists`));

    const userResponse = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      country: user.country,
      state: user.state,
      city: user.city,
      roll: user.roll,
      isVerified: user.isVerified,
      ibiName: user.ibiName,
      ibiId: user.ibiId,
      walletAddress: user.walletAddress,
      documentId: user.documentId,
      documentFrontImage: `${baseUrl}/temp/${user.documentFront}`,
      documentBackImage: `${baseUrl}/temp/${user.documentBack}`,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, userResponse, `Profile fetched successfully`));
  } catch (error) {
    console.log(`error while getting profile  ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const transactionDetailsHandle = async (req, res) => {
  try {
    const { transactionHash, amount, price, value, status, type } = req.body;

    const schema = Joi.object({
      transactionHash: Joi.string().required(),
      amount: Joi.string().required(),
      price: Joi.string().required(),
      value: Joi.string().required(),
      status: Joi.string().required(),
      type: Joi.string()
        .valid("deposit", "withdrawal", "transfer", "buy", "reward", "claim")
        .required(),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return res
        .status(401)
        .json(new ApiResponse(400, {}, error.details[0].message));
    }

    const existedTx = await prisma.transaction.findFirst({
      where: {
        transactionHash,
      },
    });

    if (existedTx)
      return res
        .status(404)
        .json(new ApiResponse(400, {}, `Treansaction Already Exists`));

    const newTx = await prisma.transaction.create({
      data: {
        userId: req.user.id,
        transactionHash,
        amount,
        price,
        value,
        status,
        type,
      },
    });

    return res
      .status(201)
      .json(new ApiResponse(200, newTx, `Transaction added successfully`));
  } catch (error) {
    console.log(`error while adding  transaction details  ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const getMyTransactionHandle = async (req, res) => {
  try {
    const txs = await prisma.transaction.findMany({
      where: {
        userId: req.user.id,
      },
    });
    console.log("txx-------------->", txs.length);

    if (txs.length <= 0)
      return res
        .status(404)
        .json(new ApiResponse(400, {}, `Transactions does not exists`));

    return res
      .status(201)
      .json(new ApiResponse(200, txs, `Transactions fetched successfully`));
  } catch (error) {
    console.log(`error while getting transaction ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const getAllreferralsHandle = async (req, res) => {
  try {
    const id = req.query.id;
    console.log("id ----------->", id);

    if (id) {
      const ref = await prisma.referral.findMany({
        where: {
          referrerId: parseInt(id),
        },
        include: {
          referred: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              roll: true,
              referralCode: true,
            },
          },
          referrer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              roll: true,
              referralCode: true,
            },
          },
        },
      });

      if (ref.length < 0) {
        return res
          .status(401)
          .json(new ApiResponse(400, {}, `Referrals does not exists`));
      }

      return res
        .status(201)
        .json(new ApiResponse(200, ref, `All referral fetched successfully`));
    } else {
      const ref = await prisma.referral.findMany({
        include: {
          referred: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              roll: true,
              referralCode: true,
            },
          },

          referrer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              roll: true,
              referralCode: true,
            },
          },
        },
      });
      return res
        .status(201)
        .json(new ApiResponse(200, ref, `All referral fetched successfully`));
    }
  } catch (error) {
    console.log(`error while getting referrals ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const updateAddressOfUserHandle = async (req, res) => {
  try {
    const { address } = req.body;

    const schema = Joi.object({
      address: Joi.string().min(5).max(200).required().messages({
        "string.empty": "Address is required",
        "string.min": "Address must be at least 5 characters long",
        "string.max": "Address cannot exceed 200 characters",
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
        id: req.user.id,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json(new ApiResponse(400, {}, `User does not exist`));
    }

    // Check if wallet address is already taken by another user
    const isAddressTaken = await prisma.user.findFirst({
      where: {
        walletAddress: address,
        NOT: {
          id: req.user.id,
        },
      },
    });

    console.log("isAddressTaken -------------->", isAddressTaken)

    if (isAddressTaken) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `This wallet address is already in use`)
        );
    }

    // Check if user has already set wallet address
    if (user.walletAddress == null) {
      await prisma.user.update({
        where: {
          id: req.user.id,
        },
        data: {
          walletAddress: address,
        },
      });

      return res
        .status(201)
        .json(new ApiResponse(200, {}, `Address added successfully`));
    } else {
      if (user.walletAddress === address) {
        return res
          .status(401)
          .json(new ApiResponse(400, {}, `Wallet address already added`));
      } else {
        return res
          .status(401)
          .json(new ApiResponse(400, {}, `Invalid wallet address`));
      }
    }
  } catch (error) {
    console.log(`Error while adding address: ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

// export const referralRewardHandle = async (req, res) => {
//   try {
//     const { value } = req.body;
//     const referredUser = await prisma.referral.findUnique({
//       where: {
//         referredId: req.user.id,
//       },
//       include: {
//         referrer: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             roll: true,
//             walletAddress: true,
//           },
//         },
//       },
//     });

//     if (!referredUser)
//       return res
//         .status(404)
//         .json(new ApiResponse(400, {}, `referral does not exists`));
//     console.log("referredUser-------->", referredUser.referrer.walletAddress);

//     // const amount = (1/10  * value)
//     // const address = referredUser.referrer.walletAddress
//     // const tx = await contractInstance.transfer(address, amount)
//     // console.log("tx ------------------>", tx)

//     // await prisma.transaction.create({
//     //   data: {
//     //     userId: referrer.id,
//     //     transactionHash: tx.hash, // Assuming `tx.hash` exists
//     //     amount: rewardAmount.toString(),
//     //     status: "completed",
//     //     type: "reward",
//     //   },
//     // });
//     // // console.log(`referral address ---------->`, referredUser.walletAddress)
//     return res
//       .status(200)
//       .json(new ApiResponse(200, {}, `Reward sent successfully`));
//   } catch (error) {
//     console.log(`error while giving rewards ${error.message}`);
//     return res
//       .status(501)
//       .json(new ApiResponse(500, {}, `Internal Server Error`));
//   }
// };

export const uploadDocumentsHandle = async (req, res) => {
  try {
    const { documentId } = req.body;

    const schema = Joi.object({
      documentId: Joi.string().min(2).max(50).required(),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return res
        .status(401)
        .json(new ApiResponse(400, {}, error.details[0].message));
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    if (!user)
      return res.status(404).json(new ApiResponse(400, {}, `User not found`));

    await prisma.user.update({
      where: {
        id: req.user.id,
      },

      data: {
        documentId: documentId,
        documentFront: req.files[0].filename ? req.files[0].filename : "",
        documentBack: req.files[1].filename ? req.files[1].filename : "",
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, `documents uploaded successfully`));
  } catch (error) {
    console.log(`error while uploading documents ${error}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const referralRewardHandle = async (req, res) => {
  try {
    const { value, price } = req.body;

    const weiValue = BigInt(value);

    // Step 1: Find the direct referrer
    const referral = await prisma.referral.findUnique({
      where: {
        referredId: req.user.id,
      },
      include: {
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!referral) {
      return res
        .status(404)
        .json(new ApiResponse(400, {}, `Referral does not exist`));
    }

    const referrer = referral.referrer;
    console.log("Direct Referrer Wallet Address:", referrer.walletAddress);

    // Step 2: Calculate direct reward (10%)
    const directReward = weiValue / BigInt(10);

    // Step 3: Send direct reward
    // const approveTx = await contractInstance.approve()
    const contract = await contractInstance();
    const directTx = await contract.transfer(
      referrer.walletAddress,
      directReward
    );

    directTx.wait();

    console.log(`directtx --------->`, directTx);

    // Step 4: Store direct reward transaction
    await prisma.transaction.create({
      data: {
        userId: referrer.id,
        transactionHash: directTx.hash,
        amount: "0",
        price: price,
        value: directReward.toString(),
        status: "completed",
        type: "reward",
      },
    });

    // Step 5: Find the root user (the first user in the referral chain)
    // const rootUser = await findRootUser(referrer.id);

    // if (rootUser) {
    //   // Step 6: Check if root user is a Core Team Member
    //   const isCoreTeamMember = await prisma.coreTeamMembers.findUnique({
    //     where: { userId: rootUser.id },
    //   });

    //   if (isCoreTeamMember) {
    //     // Step 7: Calculate and send root reward (2.5%)
    //     const rootReward = (2.5 / 100) * value;
    //     const rootTx = await contractInstance.transfer(
    //       rootUser.walletAddress,
    //       rootReward
    //     );

    //     // Step 8: Store root reward transaction
    //     await prisma.transaction.create({
    //       data: {
    //         userId: rootUser.id,
    //         transactionHash: rootTx.hash,
    //         amount: rootReward.toString(),
    //         status: "completed",
    //         type: "reward",
    //       },
    //     });
    //   }
    // }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, `Rewards sent successfully`));
  } catch (error) {
    console.log(`Error while distributing rewards: ${error.message}`);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const getReferralCodeHandle = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    if (!user)
      return res
        .status(401)
        .json(new ApiResponse(400, {}, `user doesn't exists`));

    const userResponse = {
      id: user.id,
      email: user.email,
      referralCode: user.referralCode,
    };
    return res
      .status(201)
      .json(
        new ApiResponse(200, userResponse, `user response fetched successfully`)
      );
  } catch (error) {
    console.log(`error while getting referral code  ${error}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const sendReferralRewardHandle = async (req, res) => {
  try {
    const contract = await contractInstance();
    const tx = await contract.userDetails(_address);

    console.log(`tx ------------>`, tx);
  } catch (error) {
    console.log(`error while sending  referral reward  ${error}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal server error`));
  }
};

// userDetails(_address)
// round 25%
// round 15%
// round 10%
// round 3 %
