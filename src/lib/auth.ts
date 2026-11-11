
import jwt from "jsonwebtoken";

interface TokenPayload {
  userId: string;
}

function getJwtSecret(): jwt.Secret {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be defined and at least 32 characters long"
    );
  }

  return secret;
}

export function generateToken(userId: string): string {
  const secret = getJwtSecret();

  return jwt.sign(
    { userId },
    secret,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): TokenPayload {
  const secret = getJwtSecret();

  const decoded = jwt.verify(token, secret);

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string"
  ) {
    throw new Error("Invalid authentication token");
  }

  return {
    userId: decoded.userId,
  };
}
