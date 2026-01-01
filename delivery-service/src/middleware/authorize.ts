import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { logInfo, logWarn } from "../utils/logger";

// Accepts a list of allowed roles
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      logWarn("authorize.no_user", {
        path: req.path,
        method: req.method,
        reason: "No user found in request",
      });
      return res.status(401).json({ message: "Unauthorized: No user found" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logWarn("authorize.insufficient_permissions", {
        userId: req.user.id,
        userRole: req.user.role,
        allowedRoles,
        path: req.path,
        method: req.method,
        reason: "User role not in allowed roles",
      });
      return res.status(403).json({ message: "Forbidden: Access denied" });
    }

    logInfo("authorize.access_granted", {
      userId: req.user.id,
      userRole: req.user.role,
      allowedRoles,
      path: req.path,
      method: req.method,
    });

    next();
  };
};
