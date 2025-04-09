import { Router } from "express";
import {
  makeAmbassdorHandle,
  makeCoreTeamHandle,
  getAllTransactions,
  getContractOwner,
  stakingRewardHandle,
  priceOfToken
} from "../controllers/admin.controller.js";
import { verifyJwt } from "../middlewares/auth.js";

const adminRouter = Router();

adminRouter.post("/ambassador", verifyJwt, makeAmbassdorHandle);
adminRouter.post("/coreTeam", verifyJwt, makeCoreTeamHandle);
adminRouter.get("/allTransactions", verifyJwt, getAllTransactions);
adminRouter.get("/owner", getContractOwner)
adminRouter.get("/price", priceOfToken)
adminRouter.post("/reward-transfer", stakingRewardHandle)

export default adminRouter;
