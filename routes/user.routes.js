import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.js";
import {
  userSignupHandle,
  verifyOtpHandle,
  loginHandle,
  resendOtpHandle,
  changePasswordHandle
} from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.post("/signup", userSignupHandle);
userRouter.post("/login", loginHandle);
userRouter.post("/verifyOtp", verifyOtpHandle);
userRouter.post("/resendOtp", resendOtpHandle);
userRouter.post("/changePassword", verifyJwt, changePasswordHandle)

export default userRouter;
