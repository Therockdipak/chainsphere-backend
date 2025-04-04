import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.js";
import {upload} from "../middlewares/multer.js"

import {
  userSignupHandle,
  verifyOtpHandle,
  loginHandle,
  resendOtpHandle,
  changePasswordHandle,
  uploadDocumentsHandle,
  myProfileHandle,
  referralRewardHandle,

} from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get("/profile", verifyJwt, myProfileHandle)
userRouter.post("/signup", userSignupHandle);
userRouter.post("/login", loginHandle);
userRouter.post("/verifyOtp", verifyOtpHandle);
userRouter.post("/resendOtp", resendOtpHandle);
userRouter.post("/changePassword", verifyJwt, changePasswordHandle)
userRouter.post("/documents", verifyJwt, upload.array(`images`, 2),uploadDocumentsHandle)
userRouter.post("/refferal-reward", verifyJwt, referralRewardHandle)

export default userRouter;