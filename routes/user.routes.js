import { Router } from "express";
import {verifyJwt} from "../middlewares/auth.js"
import {
  userLoginHandle,
  userSignupHandle,
  verifyOtpHandle,
  loginHandle,
} from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get("/login", userLoginHandle);
userRouter.post("/signup", userSignupHandle);
userRouter.post("/login", loginHandle);
userRouter.post("/verifyOtp", verifyOtpHandle);

export default userRouter;
