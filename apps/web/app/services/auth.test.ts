import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import * as auth from "./auth";

const mocks = vi.hoisted(() => {
  return {
    lucia: {
      readSessionCookie: vi.fn(),
      validateSession: vi.fn(),
      createSessionCookie: vi.fn(),
      createBlankSessionCookie: vi.fn(),
      createSession: vi.fn(),
      invalidateSession: vi.fn(),
    },
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
    hashPassword: vi.fn().mockResolvedValue("hashed_password"),
    verifyPassword: vi.fn(),
  };
});

// Mock dependencies
const mockUser = {
  id: "user-123",
  email: "test@example.com",
  passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$matches",
};

const mockSession = {
  id: "session-123",
  userId: "user-123",
  fresh: true,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60),
};

const mockCookie = {
  serialize: () => "auth_session=session-123; Path=/; HttpOnly",
};

// Mock modules
vi.mock("~/auth.server", () => ({
  lucia: mocks.lucia,
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
}));

vi.mock("~/lib/db.server", () => ({
  prisma: mocks.prisma,
}));

// Re-import mocked modules to control mocks
import { verifyPassword } from "~/auth.server";

describe("Auth Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateRequest", () => {
    it("should return nulls if no session cookie", async () => {
      const request = new Request("http://localhost");
      mocks.lucia.readSessionCookie.mockReturnValue(null);

      const result = await auth.validateRequest(request);

      expect(mocks.lucia.readSessionCookie).toHaveBeenCalled();
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
    });

    it("should validate session if cookie exists", async () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "auth_session=session-123" },
      });
      mocks.lucia.readSessionCookie.mockReturnValue("session-123");
      mocks.lucia.validateSession.mockResolvedValue({ user: mockUser, session: mockSession });
      mocks.lucia.createSessionCookie.mockReturnValue(mockCookie);

      const result = await auth.validateRequest(request);

      expect(mocks.lucia.validateSession).toHaveBeenCalledWith("session-123");
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
    });
  });

  describe("login", () => {
    it("should return null if user not found", async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);

      const result = await auth.login("test@example.com", "password");

      expect(result).toBeNull();
    });

    it("should return null if password invalid", async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      (verifyPassword as unknown as Mock).mockResolvedValue(false);

      const result = await auth.login("test@example.com", "wrongpassword");

      expect(result).toBeNull();
    });

    it("should create session if credentials valid", async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      (verifyPassword as unknown as Mock).mockResolvedValue(true);
      mocks.lucia.createSession.mockResolvedValue(mockSession);
      mocks.lucia.createSessionCookie.mockReturnValue(mockCookie);

      const result = await auth.login("test@example.com", "password");

      expect(result).not.toBeNull();
      expect(result?.user).toEqual(mockUser);
      expect(result?.session).toEqual(mockSession);
      expect(result?.headers.get("Set-Cookie")).toContain("auth_session=session-123");
    });
  });

  describe("signup", () => {
    it("should return error if user already exists", async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await auth.signup("test@example.com", "password");

      expect(result).toEqual({ error: "User already exists" });
    });

    it("should create user and session", async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);
      mocks.prisma.user.create.mockResolvedValue(mockUser);
      mocks.lucia.createSession.mockResolvedValue(mockSession);
      mocks.lucia.createSessionCookie.mockReturnValue(mockCookie);

      const result = await auth.signup("new@example.com", "password");

      expect(mocks.prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "new@example.com",
          passwordHash: "hashed_password",
          name: undefined,
        },
      });
      expect(result).not.toHaveProperty("error");
      if ("user" in result!) {
        expect(result.user).toEqual(mockUser);
      }
    });
  });

  describe("logout", () => {
    it("should invalidate session", async () => {
      const request = new Request("http://localhost");

      mocks.lucia.readSessionCookie.mockReturnValue("session-123");
      mocks.lucia.validateSession.mockResolvedValue({ user: mockUser, session: mockSession });
      mocks.lucia.createBlankSessionCookie.mockReturnValue({
        serialize: () => "auth_session=; Max-Age=0",
      });

      await auth.logout(request);

      expect(mocks.lucia.invalidateSession).toHaveBeenCalledWith("session-123");
    });
  });
});
