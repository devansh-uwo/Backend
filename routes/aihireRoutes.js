import express from "express";
import multer from "multer";
import {
    generateJobDescription,
    generateOfferLetter,
    generateInterviewQuestions,
    getHistory,
    deleteHistory,
    extractTemplateText
} from "../controllers/aihireController.js";
import { optionalVerifyToken } from "../middleware/authorization.js";
import { identifyGuest } from "../middleware/guestMiddleware.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 }, storage });

// Apply middleware to all routes
router.post("/job-description", optionalVerifyToken, identifyGuest, generateJobDescription);
router.post("/offer-letter", optionalVerifyToken, identifyGuest, generateOfferLetter);
router.post("/interview-questions", optionalVerifyToken, identifyGuest, generateInterviewQuestions);
router.post("/extract-template", optionalVerifyToken, identifyGuest, upload.single("file"), extractTemplateText);
router.get("/history", optionalVerifyToken, identifyGuest, getHistory);
router.delete("/history/:id", optionalVerifyToken, identifyGuest, deleteHistory);

export default router;
