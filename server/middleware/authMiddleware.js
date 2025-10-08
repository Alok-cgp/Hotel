// middleware/authMiddleware.js
export const protect = async (req, res, next) => {
  try {
    const auth = req.auth();
    // Debug log to check what is available
    console.log("Auth object:", auth);
    if (!auth || !auth.userId) {
      return res.status(401).json({ message: "Not authorized" });
    }
    req.userId = auth.userId;
    req.userEmail = auth.user?.emailAddress || auth.emailAddress || null;
    req.userName = auth.user?.username || auth.user?.firstName || "Guest";
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized" });
  }
};