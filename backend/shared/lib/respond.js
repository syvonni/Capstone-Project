function success(res, status, data, message) {
  // Standardize response format: { ok: true, data: ... }
  const payload = { ok: true, data }
  if (message) payload.message = message
  return res.status(status).json(payload)
}

function error(res, status, code, message, details = null) {
  return res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}

module.exports = { success, error };
