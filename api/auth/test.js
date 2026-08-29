import { adminAuth } from "./firebaseAdmin.js";

export default async function handler(req, res) {
  try {
    const projectId = adminAuth.app.options.credential?.projectId;

    return res.status(200).json({
      success: true,
      message: "Firebase Admin connection is working",
      projectId,
    });
  } catch (error) {
    console.error("Firebase Admin test error:", error);

    return res.status(500).json({
      success: false,
      message: "Firebase Admin connection failed",
      error: error.message,
    });
  }
}