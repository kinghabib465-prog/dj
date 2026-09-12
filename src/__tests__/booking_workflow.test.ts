// src/__tests__/booking_workflow.test.ts
import { describe, it, expect } from "vitest";
import {
  BOOKING_STATUSES,
  STATUS_LABELS,
  STATUS_BADGE,
  STATUS_CHIP,
  statusLabel,
  statusBadge,
  statusChip,
  isRequestStatus,
  isActiveRental,
  isEquipmentOut,
  isClosed,
  getAllowedActions,
  canPerform,
  getNextAction,
  getNextStepHint,
  blockingReason,
  getReturnTiming,
  deriveRemainingOut,
  RETURN_TIMING_LABELS,
} from "../domain/bookingWorkflow";

describe("status vocabulary", () => {
  it("labels every status", () => {
    for (const s of BOOKING_STATUSES) {
      expect(STATUS_LABELS[s]).toBeTruthy();
      expect(STATUS_BADGE[s]).toBeTruthy();
      expect(STATUS_CHIP[s]).toBeTruthy();
    }
  });

  it("relabels PENDING_PAYMENT_REVIEW as a new request", () => {
    expect(statusLabel("PENDING_PAYMENT_REVIEW")).toContain("طلب جديد");
  });

  it("falls back safely for unknown statuses", () => {
    expect(statusLabel("WHATEVER")).toBe("WHATEVER");
    expect(statusLabel(null)).toBe("—");
    expect(statusBadge(undefined)).toContain("bg-gray-500/15");
    expect(statusChip(undefined)).toContain("bg-gray-700");
  });

  it("classifies status groups", () => {
    expect(isRequestStatus("PENDING_PAYMENT_REVIEW")).toBe(true);
    expect(isRequestStatus("CONFIRMED")).toBe(false);

    expect(isActiveRental("CONFIRMED")).toBe(true);
    expect(isActiveRental("RETURN_PENDING")).toBe(true);
    expect(isActiveRental("COMPLETED")).toBe(false);

    expect(isEquipmentOut("EQUIPMENT_OUT")).toBe(true);
    expect(isEquipmentOut("RETURN_PENDING")).toBe(true);
    expect(isEquipmentOut("CONFIRMED")).toBe(false);

    expect(isClosed("COMPLETED")).toBe(true);
    expect(isClosed("CANCELLED")).toBe(true);
    expect(isClosed("EXPIRED")).toBe(true);
    expect(isClosed("CONFIRMED")).toBe(false);
  });
});

describe("getAllowedActions", () => {
  it("request under review: accept, edit, reject-and-delete, permanent delete", () => {
    const actions = getAllowedActions("PENDING_PAYMENT_REVIEW", { remainingAmount: 0 });
    expect(actions).toContain("ACCEPT_REQUEST");
    expect(actions).toContain("EDIT_DETAILS");
    expect(actions).toContain("REJECT_AND_DELETE");
    expect(actions).toContain("PERMANENT_DELETE");
    expect(actions).not.toContain("HAND_OVER");
    expect(actions).not.toContain("MOVE_TO_TRASH");
  });

  it("request with no deposit payment cannot be accepted or rejected", () => {
    const actions = getAllowedActions("PENDING_PAYMENT_REVIEW", { hasDepositPayment: false });
    expect(actions).not.toContain("ACCEPT_REQUEST");
    expect(actions).not.toContain("REJECT_AND_DELETE");
  });

  it("request loses permanent delete while money is outstanding", () => {
    const actions = getAllowedActions("PENDING_PAYMENT_REVIEW", { remainingAmount: 5000 });
    expect(actions).toContain("ACCEPT_REQUEST");
    expect(actions).not.toContain("PERMANENT_DELETE");
  });

  it("confirmed with outstanding balance can record balance and edit", () => {
    const actions = getAllowedActions("CONFIRMED", { remainingAmount: 8000 });
    expect(actions).toContain("RECORD_BALANCE");
    expect(actions).toContain("EDIT_DETAILS");
    expect(actions).not.toContain("HAND_OVER");
  });

  it("confirmed with zero balance cannot record balance", () => {
    expect(getAllowedActions("CONFIRMED", { remainingAmount: 0 })).not.toContain("RECORD_BALANCE");
  });

  it("ready for pickup allows hand over even with outstanding balance (warning only)", () => {
    const actions = getAllowedActions("READY_FOR_PICKUP", { remainingAmount: 3000 });
    expect(actions).toContain("HAND_OVER");
    expect(actions).toContain("RECORD_BALANCE");
  });

  it("equipment out allows price adjustment, refund and starting the return", () => {
    const actions = getAllowedActions("EQUIPMENT_OUT", { remainingAmount: 0 });
    expect(actions).toContain("START_RETURN");
    expect(actions).toContain("ADJUST_PRICE");
    expect(actions).toContain("RECORD_REFUND");
    expect(actions).not.toContain("COMPLETE");
  });

  it("return pending completes only when nothing is out, missing or owed", () => {
    expect(
      getAllowedActions("RETURN_PENDING", { remainingAmount: 0, outsideQuantity: 0, unresolvedMissingCount: 0 }),
    ).toContain("COMPLETE");

    expect(getAllowedActions("RETURN_PENDING", { remainingAmount: 0, outsideQuantity: 2 })).not.toContain("COMPLETE");

    expect(getAllowedActions("RETURN_PENDING", { remainingAmount: 0, unresolvedMissingCount: 1 })).not.toContain(
      "COMPLETE",
    );

    expect(getAllowedActions("RETURN_PENDING", { remainingAmount: 1000 })).not.toContain("COMPLETE");
  });

  it("active rentals cannot be trashed or permanently deleted", () => {
    for (const s of ["CONFIRMED", "READY_FOR_PICKUP", "EQUIPMENT_OUT", "RETURN_PENDING"]) {
      const actions = getAllowedActions(s, { remainingAmount: 0 });
      expect(actions).not.toContain("MOVE_TO_TRASH");
      expect(actions).not.toContain("PERMANENT_DELETE");
    }
  });

  it("closed bookings cannot be acted on", () => {
    for (const s of ["COMPLETED", "CANCELLED", "EXPIRED"]) {
      const actions = getAllowedActions(s);
      expect(actions).not.toContain("MOVE_TO_TRASH");
      expect(actions).not.toContain("COMPLETE");
      expect(actions).not.toContain("HAND_OVER");
    }
  });

  it("a rejected payment can be trashed", () => {
    expect(getAllowedActions("PAYMENT_REJECTED")).toContain("MOVE_TO_TRASH");
  });

  it("treats missing numeric flags as zero", () => {
    expect(getAllowedActions("RETURN_PENDING")).toContain("COMPLETE");
    expect(getAllowedActions("CONFIRMED")).not.toContain("RECORD_BALANCE");
  });
});

describe("canPerform / getNextAction", () => {
  it("canPerform mirrors getAllowedActions", () => {
    expect(canPerform("EQUIPMENT_OUT", "START_RETURN")).toBe(true);
    expect(canPerform("EQUIPMENT_OUT", "HAND_OVER")).toBe(false);
  });

  it("walks the happy path one step at a time", () => {
    expect(getNextAction("PENDING_PAYMENT_REVIEW")).toBe("ACCEPT_REQUEST");
    expect(getNextAction("CONFIRMED", { remainingAmount: 0 })).toBe("RECORD_BALANCE");
    expect(getNextAction("READY_FOR_PICKUP")).toBe("HAND_OVER");
    expect(getNextAction("EQUIPMENT_OUT")).toBe("START_RETURN");
    expect(getNextAction("RETURN_PENDING", { outsideQuantity: 0, unresolvedMissingCount: 0 })).toBe("COMPLETE");
  });

  it("has no next action for closed bookings", () => {
    expect(getNextAction("COMPLETED")).toBeNull();
    expect(getNextAction("CANCELLED")).toBeNull();
  });

  it("offers no next action while a return is incomplete", () => {
    expect(getNextAction("RETURN_PENDING", { outsideQuantity: 1 })).toBeNull();
  });
});

describe("guidance and blocking reasons", () => {
  it("hints at the customer call for a new request", () => {
    expect(getNextStepHint("PENDING_PAYMENT_REVIEW")).toContain("اتصل بالعميل");
  });

  it("explains every completion blocker", () => {
    const reason = blockingReason("RETURN_PENDING", {
      outsideQuantity: 2,
      unresolvedMissingCount: 1,
      remainingAmount: 4000,
    });
    expect(reason).toContain("خارج المخزن");
    expect(reason).toContain("مفقودة");
    expect(reason).toContain("متبقٍ");
  });

  it("returns null when completion is unblocked or irrelevant", () => {
    expect(blockingReason("RETURN_PENDING", {})).toBeNull();
    expect(blockingReason("CONFIRMED", { remainingAmount: 9000 })).toBeNull();
  });
});

describe("getReturnTiming", () => {
  const expected = "2026-05-10T10:00:00.000Z";

  it("classifies early, on-time and late returns", () => {
    expect(getReturnTiming("2026-05-06T10:00:00.000Z", expected)).toBe("EARLY");
    expect(getReturnTiming("2026-05-10T18:00:00.000Z", expected)).toBe("ON_TIME");
    expect(getReturnTiming("2026-05-20T10:00:00.000Z", expected)).toBe("LATE");
  });

  it("handles missing or invalid dates", () => {
    expect(getReturnTiming(null, expected)).toBe("UNKNOWN");
    expect(getReturnTiming(expected, null)).toBe("UNKNOWN");
    expect(getReturnTiming("not-a-date", expected)).toBe("UNKNOWN");
  });

  it("labels every timing", () => {
    expect(RETURN_TIMING_LABELS.EARLY).toBe("إرجاع مبكر");
    expect(RETURN_TIMING_LABELS.LATE).toBe("إرجاع متأخر");
  });
});

describe("deriveRemainingOut", () => {
  it("computes what is still outside", () => {
    expect(deriveRemainingOut(4, 3, 0, 0)).toBe(1);
    expect(deriveRemainingOut(4, 4, 0, 0)).toBe(0);
    expect(deriveRemainingOut(4, 1, 1, 1)).toBe(1);
  });

  it("never goes negative", () => {
    expect(deriveRemainingOut(2, 5, 0, 0)).toBe(0);
  });
});
