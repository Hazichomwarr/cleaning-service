import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAdminWorkersQuery } from "../admin-workers-query";

describe("admin worker query", () => { it("normalizes search, type, status, and page", () => assert.deepEqual(parseAdminWorkersQuery({ search: "  maria ", type: "CREW", status: "INACTIVE", page: "2" }), { search: "maria", type: "CREW", status: "INACTIVE", page: 2 })); it("falls back safely for unsupported values", () => assert.deepEqual(parseAdminWorkersQuery({ type: "BAD", status: "BAD", page: "0" }), { search: "", type: "ALL", status: "ALL", page: 1 })); });
