import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./auth";

export function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      userId: null,
      error: NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    return {
      userId: decoded.userId as string,
      error: null,
    };
  } catch {
    return {
      userId: null,
      error: NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 401 }
      ),
    };
  }
}