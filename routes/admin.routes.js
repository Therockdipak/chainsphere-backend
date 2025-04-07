import { Router } from "express";
import {
  makeAmbassdorHandle,
  makeCoreTeamHandle,
  getAllTransactions,
  getContractOwner,
  stakingRewardHandle
} from "../controllers/admin.controller.js";
import { verifyJwt } from "../middlewares/auth.js";

const adminRouter = Router();

adminRouter.post("/ambassador", verifyJwt, makeAmbassdorHandle);
adminRouter.post("/coreTeam", verifyJwt, makeCoreTeamHandle);
adminRouter.get("/allTransactions", verifyJwt, getAllTransactions);
adminRouter.get("/owner", getContractOwner)

export default adminRouter;
