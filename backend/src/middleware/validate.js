// src/middleware/validate.js
//
// Lightweight, dependency-free request-body validation/sanitization for the
// CRUD endpoints (journal, investment, watchlist). Rejects malformed input
// with a 400 before it ever reaches a controller or the database.
//
// Each validator returns an Express middleware. On failure it responds with
// { success: false, message } and a 400 status. On success it REPLACES
// req.body with a sanitized, whitelisted object so controllers only ever see
// known, type-coerced fields (this also strips any injected operator keys
// like `$gt` / `__proto__`).
//
const MAX_STR = 2000;

const fail = (res, message) =>
  res.status(400).json({ success: false, message });

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

function cleanString(value, { max = MAX_STR } = {}) {
  if (value === undefined || value === null) return "";
  const s = String(value).trim();
  return s.length > max ? s.slice(0, max) : s;
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function validateDate(value) {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: "" };
  }
  const s = String(value).trim();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return { ok: false };
  return { ok: true, value: s };
}

function requireObjectBody(req, res) {
  if (!isPlainObject(req.body)) {
    fail(res, "Request body must be a JSON object.");
    return false;
  }
  return true;
}

// ── Journal / Investment trade validation ─────────────────────────────
function makeTradeValidator({ requireScrip }) {
  const NUMERIC_FIELDS = [
    "qty", "buyRate", "sellRate", "soldRate",
    "buyAmt", "soldAmt", "ltp", "valueAsOfLtp",
  ];
  const DATE_FIELDS = ["boughtDate", "soldDate"];

  return (req, res, next) => {
    if (!requireObjectBody(req, res)) return;
    const body = req.body;
    const out  = {};

    const scrip = cleanString(body.scrip, { max: 50 });
    if (requireScrip && !scrip) return fail(res, "scrip is required.");
    if (scrip) out.scrip = scrip.toUpperCase();

    if (body.sector  !== undefined) out.sector  = cleanString(body.sector, { max: 100 });
    if (body.remarks !== undefined) out.remarks = cleanString(body.remarks);
    if (body.rr      !== undefined) out.rr      = cleanString(body.rr, { max: 50 });

    for (const f of NUMERIC_FIELDS) {
      if (body[f] === undefined) continue;
      const n = toNumberOrNull(body[f]);
      if (n === null && body[f] !== "" && body[f] !== null) {
        return fail(res, `${f} must be a valid number.`);
      }
      if (n !== null && n < 0) return fail(res, `${f} cannot be negative.`);
      out[f] = body[f] === "" || body[f] === null ? "" : n;
    }

    for (const f of DATE_FIELDS) {
      if (body[f] === undefined) continue;
      const { ok, value } = validateDate(body[f]);
      if (!ok) return fail(res, `${f} must be a valid date (YYYY-MM-DD).`);
      out[f] = value;
    }

    req.body = out;
    next();
  };
}

const validateJournalTrade    = makeTradeValidator({ requireScrip: true });
const validateInvestmentTrade = makeTradeValidator({ requireScrip: true });
const validateTradeUpdate     = makeTradeValidator({ requireScrip: false });

// ── Watchlist validation ───────────────────────────────────────
function validateWatchlistItem({ requireScrip }) {
  return (req, res, next) => {
    if (!requireObjectBody(req, res)) return;
    const body = req.body;
    const out  = {};

    const scrip = cleanString(body.scrip, { max: 50 });
    if (requireScrip && !scrip) return fail(res, "Scrip name is required.");
    if (scrip) out.scrip = scrip.toUpperCase();

    if (body.sector !== undefined) out.sector = cleanString(body.sector, { max: 100 });
    if (body.notes  !== undefined) out.notes  = cleanString(body.notes);

    for (const f of ["breakout", "support", "resistance"]) {
      if (body[f] === undefined) continue;
      const n = toNumberOrNull(body[f]);
      if (n === null) return fail(res, `${f} must be a valid number.`);
      if (n < 0) return fail(res, `${f} cannot be negative.`);
      out[f] = n;
    }

    req.body = out;
    next();
  };
}

// ── ObjectId param guard (for :id routes) ─────────────────────────────
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
function validateObjectIdParam(req, res, next) {
  if (!OBJECT_ID_RE.test(String(req.params.id || ""))) {
    return fail(res, "Invalid id parameter.");
  }
  next();
}

// ── Notification email validation ─────────────────────────────────
function validateNotificationEmail(req, res, next) {
  if (!requireObjectBody(req, res)) return;
  const subject = cleanString(req.body.subject, { max: 200 });
  const message = cleanString(req.body.message, { max: 10000 });
  if (!subject) return fail(res, "subject is required.");
  if (!message) return fail(res, "message is required.");
  req.body = { subject, message };
  next();
}

module.exports = {
  validateJournalTrade,
  validateInvestmentTrade,
  validateTradeUpdate,
  validateWatchlistCreate: validateWatchlistItem({ requireScrip: true }),
  validateWatchlistUpdate: validateWatchlistItem({ requireScrip: false }),
  validateObjectIdParam,
  validateNotificationEmail,
};
