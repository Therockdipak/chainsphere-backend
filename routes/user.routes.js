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
  getAllreferralsHandle,
  getMyTransactionHandle,
  transactionDetailsHandle,
  updateAddressOfUserHandle,
  forgotPasswordHandle
  

} from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get("/profile", verifyJwt, myProfileHandle)
userRouter.post("/signup", userSignupHandle);
userRouter.post("/login", loginHandle);
userRouter.post("/verifyOtp", verifyOtpHandle);
userRouter.post("/resendOtp", resendOtpHandle);
userRouter.post("/change-password", verifyJwt, changePasswordHandle)
userRouter.get("/referrals", verifyJwt, getAllreferralsHandle)
userRouter.get("/transactions", verifyJwt, getMyTransactionHandle)
userRouter.post("/transaction", verifyJwt, transactionDetailsHandle)
userRouter.post("/documents", verifyJwt, upload.array(`images`, 2),uploadDocumentsHandle)
userRouter.post("/refferal-reward", verifyJwt, referralRewardHandle)
userRouter.post("/add-address", verifyJwt, updateAddressOfUserHandle)
userRouter.post("/forgot-password", verifyJwt, forgotPasswordHandle )


export default userRouter;