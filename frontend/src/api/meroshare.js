// src/api/meroshare.js
//
// FIX [HIGH — SEC-9]: All user-supplied query parameters are now passed
// through encodeURIComponent() before being interpolated into the URL string.
//
// BUG (original): `type` and `script` were interpolated directly:
//   apiFetch(`/issues?type=${type}`, token)
//   apiFetch(`/wacc?script=${script}`, token)
//
// If either value contained URL-special characters (e.g. `&`, `=`, `#`, `?`)
// those characters would be interpreted as query-string delimiters by the
// fetch() implementation and the backend URL parser, allowing a caller to
// inject additional query parameters. For example:
//   getIssues(token, "IPO&limit=9999")
// would send:  GET /api/issues?type=IPO&limit=9999
// and the backend would see `req.query.limit = "9999"` as a separate param.
//
// While the backend's escapeRegex() in getApplicableIssues() prevents RegExp
// injection and the MongoDB query itself is safe, the extra injected params
// could still affect server behaviour (e.g. future pagination params) and
// the principle-of-least-surprise for any future parameter added.
//
// FIX: Wrap every user-supplied query value with encodeURIComponent().
// This encodes `&` → `%26`, `=` → `%3D`, `?` → `%3F`, etc., so they
// are treated as part of the parameter value, not as delimiters.
//
import { apiFetch } from "./client";

export const getProfile   = (token)         => apiFetch("/profile",   token);
export const getShares    = (token)         => apiFetch("/shares",     token);
export const getPortfolio = (token)         => apiFetch("/portfolio",  token);

export const getIssues = (token, type) =>
  apiFetch(`/issues${type ? `?type=${encodeURIComponent(type)}` : ""}`, token);

export const getWacc = (token, script) =>
  apiFetch(`/wacc${script ? `?script=${encodeURIComponent(script)}` : ""}`, token);

export const getSyncLogs  = (token)         => apiFetch("/sync/logs", token);

// Portfolio refresh (browser reload — updates LTP / current values from MeroShare)
// If MeroShare session expired, apiFetch dispatches "meroshare:sessionExpired"
// and AuthContext automatically logs the user out and redirects to login.
export const refreshPortfolio = (token) =>
  apiFetch("/portfolio/refresh", token, { method: "POST" });

export const sendNotificationEmail = (token, payload) =>
  apiFetch("/notifications/send-email", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });

// ── Journal trades ─────────────────────────────────────────────────────────
export const getJournalTrades = (token) =>
  apiFetch("/journal-trades", token);

export const createJournalTrade = (token, payload) =>
  apiFetch("/journal-trades", token, { method: "POST", body: JSON.stringify(payload) });

export const updateJournalTrade = (token, id, payload) =>
  apiFetch(`/journal-trades/${id}`, token, { method: "PUT", body: JSON.stringify(payload) });

export const deleteJournalTrade = (token, id) =>
  apiFetch(`/journal-trades/${id}`, token, { method: "DELETE" });

// ── Investment trades ──────────────────────────────────────────────────
export const getInvestmentTrades = (token) =>
  apiFetch("/investment-trades", token);

export const createInvestmentTrade = (token, payload) =>
  apiFetch("/investment-trades", token, { method: "POST", body: JSON.stringify(payload) });

export const updateInvestmentTrade = (token, id, payload) =>
  apiFetch(`/investment-trades/${id}`, token, { method: "PUT", body: JSON.stringify(payload) });

export const deleteInvestmentTrade = (token, id) =>
  apiFetch(`/investment-trades/${id}`, token, { method: "DELETE" });

// ── Watchlist items ─────────────────────────────────────────────────────────
export const getWatchlistItems   = (token)              => apiFetch("/watchlist-items", token);
export const createWatchlistItem = (token, payload)     => apiFetch("/watchlist-items", token, { method: "POST", body: JSON.stringify(payload) });
export const updateWatchlistItem = (token, id, payload) => apiFetch(`/watchlist-items/${id}`, token, { method: "PUT", body: JSON.stringify(payload) });
export const deleteWatchlistItem = (token, id)          => apiFetch(`/watchlist-items/${id}`, token, { method: "DELETE" });