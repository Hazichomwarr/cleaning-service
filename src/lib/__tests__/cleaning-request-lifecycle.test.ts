import assert from "node:assert/strict";
import test from "node:test";
import { CleaningRequestStatus } from "../../generated/prisma/client.js";
import { canTransitionCleaningRequestStatus, getAllowedCleaningRequestTransitions } from "../cleaning-request-lifecycle.js";

test("allows only the ordered lifecycle transitions", () => {
  assert.equal(canTransitionCleaningRequestStatus(CleaningRequestStatus.NEW, CleaningRequestStatus.REVIEWING), true);
  assert.equal(canTransitionCleaningRequestStatus(CleaningRequestStatus.NEW, CleaningRequestStatus.CANCELLED), true);
  assert.equal(canTransitionCleaningRequestStatus(CleaningRequestStatus.REVIEWING, CleaningRequestStatus.CONFIRMED), true);
  assert.equal(canTransitionCleaningRequestStatus(CleaningRequestStatus.CONFIRMED, CleaningRequestStatus.ASSIGNED), true);
  assert.equal(canTransitionCleaningRequestStatus(CleaningRequestStatus.ASSIGNED, CleaningRequestStatus.IN_PROGRESS), true);
  assert.equal(canTransitionCleaningRequestStatus(CleaningRequestStatus.IN_PROGRESS, CleaningRequestStatus.COMPLETED), true);
  assert.equal(canTransitionCleaningRequestStatus(CleaningRequestStatus.NEW, CleaningRequestStatus.CONFIRMED), false);
  assert.equal(canTransitionCleaningRequestStatus(CleaningRequestStatus.CONFIRMED, CleaningRequestStatus.COMPLETED), false);
  assert.equal(canTransitionCleaningRequestStatus(CleaningRequestStatus.COMPLETED, CleaningRequestStatus.IN_PROGRESS), false);
  assert.deepEqual(getAllowedCleaningRequestTransitions(CleaningRequestStatus.CANCELLED), []);
});
