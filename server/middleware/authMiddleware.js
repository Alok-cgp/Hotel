import { verifyToken } from '@clerk/backend';

export const protect = async (req, res, next) => {
  try {
    // Method 1: Check if req.auth is populated by clerkMiddleware
    let userId = null;
    let sessionClaims = null;

    // Handle req.auth as function (new Clerk API)
    if (typeof req.auth === 'function') {
      const authData = req.auth();
      userId = authData?.userId;
      sessionClaims = authData?.sessionClaims;
    } 
    // Handle req.auth as object (old Clerk API)
    else if (req.auth && typeof req.auth === 'object') {
      userId = req.auth.userId;
      sessionClaims = req.auth.sessionClaims;
    }

    if (userId) {
      req.userId = userId;
      req.userEmail = sessionClaims?.email || null;
      req.userName = sessionClaims?.fullName || sessionClaims?.firstName || "Guest";
      return next();
    }

    // Method 2: Manual Bearer token verification
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: "No authorization token provided" 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify using @clerk/backend with clock tolerance
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      clockSkewInMs: 60000, // ✅ Allow 60 seconds of clock skew
    });

    if (!payload || !payload.sub) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token" 
      });
    }

    req.userId = payload.sub;
    req.userEmail = payload.email || null;
    req.userName = payload.name || payload.first_name || "Guest";
    
    console.log("✅ User authenticated:", req.userId);
    next();
  } catch (error) {
    console.error("❌ Auth error:", error.message);
    res.status(401).json({ 
      success: false,
      message: "Authentication failed",
      error: error.message 
    });
  }
};