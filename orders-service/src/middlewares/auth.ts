import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Ideally store this securely in .env
const JWT_SECRET = "be5e2c89748a4281d8c0f15a8f0a8e4f047769c616960281bdfa6c011f2b2b31fb4c44ed42a41f87341389e3cb411464ac0a0d926d624c7272293787ae7f83d4"; 

export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string; restaurantId?: string; };
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return res.status(403).json({ message: "Forbidden: Invalid token" });
  }
};
