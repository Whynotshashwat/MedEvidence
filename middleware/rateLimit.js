const hits = new Map();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now - entry.windowStart > 300_000) hits.delete(key);
  }
}, 300_000);

export function rateLimit({ windowMs = 900_000, max = 20, message = "Too many requests" } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      entry = { count: 1, windowStart: now };
      hits.set(key, entry);
      return next();
    }

    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}
