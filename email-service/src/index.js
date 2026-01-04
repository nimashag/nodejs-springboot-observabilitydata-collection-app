require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const emailRoutes = require("./routes/email.routes");

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60, // 60 req/min
  })
);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/v1/email", emailRoutes);

const port = Number(process.env.PORT || 5050);
app.listen(port, () => console.log(`📨 Email service running on :${port}`));
