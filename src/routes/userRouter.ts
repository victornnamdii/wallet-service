import { Router } from "express";
import UserController from "../controllers/userController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/signup", UserController.signUp);
router.post("/login", UserController.logIn);
router.get("/profile", verifyToken, UserController.profile);


export default router;