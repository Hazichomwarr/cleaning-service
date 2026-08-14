import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WorkerCreationInputSchema } from "../validations/worker.schema";

describe("worker schema", () => { it("trims names and normalizes email", () => { const result = WorkerCreationInputSchema.parse({ firstName: " Maria ", lastName: " Lopez ", phone: "9735551234", email: " MARIA@EXAMPLE.COM ", type: "CREW" }); assert.equal(result.firstName, "Maria"); assert.equal(result.email, "maria@example.com"); }); it("requires contact and rejects privileged fields", () => { assert.equal(WorkerCreationInputSchema.safeParse({ firstName: "Maria", lastName: "Lopez", type: "CREW" }).success, false); assert.equal(WorkerCreationInputSchema.safeParse({ firstName: "Maria", lastName: "Lopez", phone: "9735551234", type: "CREW", isActive: false }).success, false); }); });
