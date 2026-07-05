import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getSessionRole(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: string } | undefined)?.role ?? null;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Throws HttpError(401/403) if the session role is not allowed. */
export async function requireRole(...roles: string[]): Promise<string> {
  const role = await getSessionRole();
  if (!role) throw new HttpError(401, "Not authenticated");
  if (roles.length && !roles.includes(role))
    throw new HttpError(403, "Insufficient permissions");
  return role;
}
