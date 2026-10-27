export function notFound(_req, res) {
  res.status(404).json({ error: { message: "Route not found", code: "NOT_FOUND" } });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: { message, code: err.code || "INTERNAL_ERROR" } });
}

export function httpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
