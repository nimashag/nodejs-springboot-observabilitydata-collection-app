import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { logInfo, logWarn, logError } from "../utils/logger";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET not set in environment");
}

export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Only log for protected endpoints (not public auth endpoints)
    if (!req.path.startsWith("/api/auth/")) {
      logWarn("auth.missing_token", {
        path: req.path,
        method: req.method,
        reason: "No Authorization header or invalid format",
      });
    }
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = { id: decoded.id, role: decoded.role };
    
    logInfo("auth.token_validated", {
      userId: decoded.id,
      role: decoded.role,
      path: req.path,
      method: req.method,
    });
    
    next();
  } catch (err) {
    logWarn("auth.token_invalid", {
      path: req.path,
      method: req.method,
      reason: err instanceof Error ? err.message : "Token verification failed",
    });
    return res.status(403).json({ message: "Forbidden: Invalid token" });
  }
};
