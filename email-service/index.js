import "dotenv/config";
import express from "express";
import emailRoutes from "./src/routes/email.routes.js";

const app = express();
app.use(express.json());

app.use("/v1/email", emailRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Email service running on port ${PORT}`);
});
