import express from "express";
import helmet from "helmet";
import env from "./config/env";
import {
  errorRequestHandler,
  pageNotFoundHandler,
} from "./middleware/errorMiddleware";
import userRouter from "./routes/userRouter";
import walletRouter from "./routes/walletRouter";

const app = express();

app.use(express.json());
app.use(helmet());

app.listen(env.PORT, () => {
  console.log(`Wallet Service Up on ${env.PORT}`);
});

app.get("/", (req, res) =>
  res.send("Welcome to Victor Ilodiuba's Wallet Service")
);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/wallet", walletRouter);

app.use(pageNotFoundHandler);
app.use(errorRequestHandler);

export default app;
