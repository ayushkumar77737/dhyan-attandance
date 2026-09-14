import { adminAuth, adminDb } from "../auth/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication token is required" });
    }

    const decodedToken = await adminAuth.verifyIdToken(authHeader.substring(7));

    // Confirm the caller is an admin
    const callerQuery = await adminDb
      .collection("users")
      .where("uid", "==", decodedToken.uid)
      .limit(1)
      .get();

    if (callerQuery.empty || callerQuery.docs[0].data().role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { targetUid, newEmail } = req.body;

    if (!targetUid || !newEmail) {
      return res.status(400).json({ success: false, message: "targetUid and newEmail are required" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    await adminAuth.updateUser(targetUid, { email: newEmail });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Update email error:", error);

    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ success: false, message: "This email is already in use by another account" });
    }

    return res.status(500).json({ success: false, message: "Unable to update email" });
  }
}