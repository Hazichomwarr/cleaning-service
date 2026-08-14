import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route.js";

test("rejects an unauthorized scheduler request without processing", async () => {
  const previous = process.env.SCHEDULER_SECRET;
  process.env.SCHEDULER_SECRET = "test-secret";
  try {
    const response = await GET(new Request("http://localhost/api/internal/upcoming-cleaning-reminders"));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { processed: false, error: "Unauthorized" });
  } finally {
    if (previous === undefined) delete process.env.SCHEDULER_SECRET;
    else process.env.SCHEDULER_SECRET = previous;
  }
});
