import Jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";
import prisma from "../DB/config.js";

export const verifyJwt = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "").trim();
  console.log(`token ---------------->`, token);
  

  if (!token) {
    return res
      .status(401)
      .json(new ApiResponse(400, {}, "Unauthorized request"));
  }

  const decodToken = Jwt.verify(token, process.env.JWT_SECRET_KEY);

  console.log(`decoded token ----------------> ${decodToken}`)

  const user = await prisma.user.findUnique({
    where: {
      id: decodToken.userId,
    },
  });

  if (user) {
    req.user = user;
    next();
  } else {
    return res.status(404).json(new ApiResponse(400, {}, `Access Forbidden`));
  }
};
