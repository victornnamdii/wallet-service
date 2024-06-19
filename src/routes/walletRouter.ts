import { Router } from "express";
import { verifyToken } from "../middleware/authMiddleware";
import WalletController from "../controllers/walletController";

const router = Router();

router.use(verifyToken);

router.get("/", WalletController.getWallet);
router.post("/fund", WalletController.fundWallet);
router.post("/withdraw", WalletController.withdraw);
router.post("/transfer/:receivingWalletId", WalletController.transfer);

export default router;
