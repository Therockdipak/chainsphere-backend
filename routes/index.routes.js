import { Router } from "express";
import userRouter from "./user.routes.js";
import adminRouter from "./admin.routes.js";


const rootRouter = Router()

rootRouter.use("/user", userRouter)
rootRouter.use("/admin", adminRouter)

export default rootRouter;