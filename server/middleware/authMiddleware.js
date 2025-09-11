import User from "../models/User.js";

// middleware/authMiddleware.js

export const protect = async (req, res, next) => {
  try {
    const {userId} = req.auth();
    // Debug log to check what is available
    // console.log("Auth object:", auth);
    if (!userId) {
      res.json({success: false, message: "Not authenticiated"});
    }else{
      const user = await User.findById(userId);
      req.user = user;
      next();
    }
    // req.userId = auth.userId;
    // req.userEmail = auth.user?.emailAddress || auth.emailAddress || null;
    // req.userName = auth.user?.username || auth.user?.firstName || "Guest";
    // next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized" });
  }
};