function attachAuthLocals(req, res, next) {
  res.locals.authUser = req.session?.user || null;
  next();
}

function isApiRequest(req) {
  return req.path.startsWith("/api") || req.originalUrl.startsWith("/api");
}

function handleUnauthorized(req, res) {
  if (isApiRequest(req)) {
    return res.status(401).json({ message: "Chua dang nhap" });
  }
  return res.redirect("/login");
}

function handleForbidden(req, res) {
  if (isApiRequest(req)) {
    return res.status(403).json({ message: "Khong co quyen truy cap" });
  }
  return res.status(403).send("Ban khong co quyen truy cap trang nay.");
}

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return handleUnauthorized(req, res);
  }
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.session?.user;
    if (!user) {
      return handleUnauthorized(req, res);
    }

    if (!roles.includes(user.role)) {
      return handleForbidden(req, res);
    }

    return next();
  };
}

module.exports = {
  attachAuthLocals,
  requireAuth,
  requireRole,
};
