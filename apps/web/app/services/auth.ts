import { lucia } from "~/auth.server";
import { hashPassword, verifyPassword } from "~/auth.server"; // Re-exporting from auth.server or moving logic here
import { prisma } from "~/lib/db.server";
import { type User } from "@vault/db";

export { hashPassword, verifyPassword };

export async function validateRequest(request: Request) {
  const sessionId = lucia.readSessionCookie(request.headers.get("Cookie") ?? "");
  if (!sessionId) {
    return { user: null, session: null, headers: new Headers() };
  }

  const { session, user } = await lucia.validateSession(sessionId);
  const headers = new Headers();

  if (session && session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    headers.append("Set-Cookie", sessionCookie.serialize());
  }
  if (!session) {
    const sessionCookie = lucia.createBlankSessionCookie();
    headers.append("Set-Cookie", sessionCookie.serialize());
  }

  return { session, user, headers };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return null;

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) return null;

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  return {
    user,
    session,
    headers: new Headers({ "Set-Cookie": sessionCookie.serialize() }),
  };
}

export async function signup(email: string, password: string, name?: string) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) return { error: "User already exists" };

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
    },
  });

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  return {
    user,
    session,
    headers: new Headers({ "Set-Cookie": sessionCookie.serialize() }),
  };
}

export async function logout(request: Request) {
  const { session } = await validateRequest(request);
  if (!session) return { headers: new Headers() };

  await lucia.invalidateSession(session.id);

  const sessionCookie = lucia.createBlankSessionCookie();
  return {
    headers: new Headers({ "Set-Cookie": sessionCookie.serialize() }),
  };
}
