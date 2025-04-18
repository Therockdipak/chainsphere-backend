import express from "express";
import "dotenv/config.js";
import cors from "cors";

import rootRouter from "./routes/index.routes.js";

const app = express();
const port = process.env.PORT || 8001;

app.use(express.json());
app.use("/api/v1",express.static("public"))

app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: process.env.ORIGIN,
  })
);

app.use("/api/v1", rootRouter);

app.get("/", (req, res) => {
  res.send("hello world!");
});

app.get("/apii", (req, res)=>{
  res.send("hey it working")
})

app.listen(port, (req, res) => {
  console.log(`server is listening on ${port}`);
});
