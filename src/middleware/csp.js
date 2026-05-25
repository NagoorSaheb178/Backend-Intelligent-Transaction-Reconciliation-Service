export const cspHeader = (req, res, next) => {
  // Basic secure CSP – adjust sources as needed
  const policy = [
    "default-src 'self'",
    "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self'",
  ].join('; ');
  res.setHeader('Content-Security-Policy', policy);
  next();
};
