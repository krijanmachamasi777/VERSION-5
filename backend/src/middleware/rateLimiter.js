// src/middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const logger = require("../utils/logger");

// Combines IP + username so different users on same WiFi are not blocked together
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // reduced from 10 → stronger security

  standardHeaders: true,
  legacyHeaders: false,

  // KEY CHANGE: per user + IP combination (with IPv6 support)
  keyGenerator: (req, res) => {
    const ipKey = ipKeyGenerator(req, res);
    const username = req.body?.username || "unknown";
    return `${ipKey}-${username}`;
  },

  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },

  handler: (req, res, _next, options) => {
    logger.warn(
      `🚫 Login rate limit hit | IP: ${req.ip} | User: ${req.body?.username}`
    );

    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { loginLimiter };