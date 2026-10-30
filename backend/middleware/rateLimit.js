// Small in-memory limiter per client IP; enough for a single server process.
export const rateLimit = ({ windowMs, max }) => {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const recent = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (recent.length >= max) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
};
