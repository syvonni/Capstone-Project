function error(res, status, code, message, details) {
  const payload = { ok: false, error: { code, message } };
  if (details !== undefined) payload.error.details = details;
  return res.status(status).json(payload);
}

function ok(res, status, data) {
  return res.status(status).json({ ok: true, data });
}

function success(res, status, data, message) {
  // Standardize response shape to { ok: true, data }
  // Message parameter is kept for backward compatibility but not used in response
  return res.status(status).json({ ok: true, data });
}

module.exports = { error, ok, success };
