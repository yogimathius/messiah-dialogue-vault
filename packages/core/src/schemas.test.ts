import { describe, it, expect } from "vitest";
import { CreateThreadSchema, CreateTurnSchema } from "./schemas";

describe("Schemas", () => {
  describe("CreateThreadSchema", () => {
    it("should validate a valid thread", () => {
      const validThread = {
        title: "My Thread",
        description: "A description",
        status: "ACTIVE",
      };

      const result = CreateThreadSchema.safeParse(validThread);
      expect(result.success).toBe(true);
    });

    it("should fail with empty title", () => {
      const invalidThread = {
        title: "",
      };

      const result = CreateThreadSchema.safeParse(invalidThread);
      expect(result.success).toBe(false);
    });
  });

  describe("CreateTurnSchema", () => {
    it("should validate a valid turn", () => {
      const validTurn = {
        threadId: "123e4567-e89b-12d3-a456-426614174000", // valid UUID
        role: "MESSIAH",
        content: "Hello world",
      };

      const result = CreateTurnSchema.safeParse(validTurn);
      expect(result.success).toBe(true);
    });

    it("should fail with invalid UUID", () => {
      const invalidTurn = {
        threadId: "not-a-uuid",
        role: "MESSIAH",
        content: "Hello world",
      };

      const result = CreateTurnSchema.safeParse(invalidTurn);
      expect(result.success).toBe(false);
    });
  });
});
