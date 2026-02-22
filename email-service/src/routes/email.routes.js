import express from "express";
import { sendIncidentEmail } from "../services/emailService.js";

const router = express.Router();

router.post("/send", async (req, res) => {
  try {
    await sendIncidentEmail(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Email failed" });
  }
});

export default router;
