/**
 * Central booking-workflow domain rules.
 *
 * Single source of truth for:
 *  - status vocabulary + Arabic labels + colours
 *  - which admin actions a booking allows, given its status and money/inventory flags
 *  - the "next action" the admin should take
 *  - why completion is blocked
 *
 * Every admin page must consume these helpers instead of re-declaring
 * status maps or ad-hoc permission booleans.
 */

export type BookingStatus =
  | "PENDING_PAYMENT_REVIEW"
  | "PAYMENT_REJECTED"
  | "CONFIRMED"
  | "READY_FOR_PICKUP"
  | "EQUIPMENT_OUT"
  | "RETURN_PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export const BOOKING_STATUSES: BookingStatus[] = [
  "PENDING_PAYMENT_REVIEW",
  "PAYMENT_REJECTED",
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "EQUIPMENT_OUT",
  "RETURN_PENDING",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
];

/** `PENDING_PAYMENT_REVIEW` is really "a new customer request awaiting review". */
export const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT_REVIEW: "طلب جديد — بانتظار المراجعة",
  PAYMENT_REJECTED: "دفع مرفوض",
  CONFIRMED: "مؤكد",
  READY_FOR_PICKUP: "جاهز للتسليم",
  EQUIPMENT_OUT: "معدات مسلمة",
  RETURN_PENDING: "بانتظار الإرجاع",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
  EXPIRED: "منتهي",
};

/** Soft badge styling (tables, detail header). */
export const STATUS_BADGE: Record<string, string> = {
  PENDING_PAYMENT_REVIEW: "bg-warning/15 text-warning",
  PAYMENT_REJECTED: "bg-red-500/15 text-red-300",
  CONFIRMED: "bg-success/15 text-success",
  READY_FOR_PICKUP: "bg-info/15 text-info",
  EQUIPMENT_OUT: "bg-blue-500/15 text-blue-300",
  RETURN_PENDING: "bg-purple-500/15 text-purple-300",
  COMPLETED: "bg-gray-500/15 text-gray-300",
  CANCELLED: "bg-gray-500/15 text-gray-400",
  EXPIRED: "bg-gray-500/15 text-gray-400",
};

/** Solid chip styling (calendar grid, legend). */
export const STATUS_CHIP: Record<string, string> = {
  PENDING_PAYMENT_REVIEW: "bg-warning text-gray-900",
  PAYMENT_REJECTED: "bg-red-500 text-white",
  CONFIRMED: "bg-success text-white",
  READY_FOR_PICKUP: "bg-info text-white",
  EQUIPMENT_OUT: "bg-blue-500 text-white",
  RETURN_PENDING: "bg-purple-500 text-white",
  COMPLETED: "bg-gray-500 text-white",
  CANCELLED: "bg-gray-700 text-gray-300",
  EXPIRED: "bg-gray-700 text-gray-300",
};

export const statusLabel = (status: string | null | undefined): string =>
  (status && STATUS_LABELS[status]) || status || "—";

export const statusBadge = (status: string | null | undefined): string =>
  (status && STATUS_BADGE[status]) || "bg-gray-500/15 text-gray-300";

export const statusChip = (status: string | null | undefined): string =>
  (status && STATUS_CHIP[status]) || "bg-gray-700 text-gray-300";

/** A booking that is only a request: nothing reserved, nothing accepted yet. */
export const isRequestStatus = (status: string): boolean =>
  status === "PENDING_PAYMENT_REVIEW";

/** Statuses where equipment is committed (reserved or physically out). */
export const isActiveRental = (status: string): boolean =>
  status === "CONFIRMED" ||
  status === "READY_FOR_PICKUP" ||
  status === "EQUIPMENT_OUT" ||
  status === "RETURN_PENDING";

/** Statuses where equipment is physically outside the warehouse. */
export const isEquipmentOut = (status: string): boolean =>
  status === "EQUIPMENT_OUT" || status === "RETURN_PENDING";

export const isClosed = (status: string): boolean =>
  status === "COMPLETED" || status === "CANCELLED" || status === "EXPIRED";

export type BookingAction =
  | "ACCEPT_REQUEST"
  | "EDIT_DETAILS"
  | "REJECT_AND_DELETE"
  | "RECORD_BALANCE"
  | "HAND_OVER"
  | "START_RETURN"
  | "ADJUST_PRICE"
  | "RECORD_REFUND"
  | "COMPLETE"
  | "MOVE_TO_TRASH"
  | "PERMANENT_DELETE";

export const ACTION_LABELS: Record<BookingAction, string> = {
  ACCEPT_REQUEST: "قبول الطلب",
  EDIT_DETAILS: "تعديل الطلب",
  REJECT_AND_DELETE: "رفض وحذف الطلب",
  RECORD_BALANCE: "تسجيل دفعة الرصيد",
  HAND_OVER: "تسليم المعدات",
  START_RETURN: "بدء الإرجاع",
  ADJUST_PRICE: "تعديل المبلغ",
  RECORD_REFUND: "تسجيل استرجاع",
  COMPLETE: "إكمال الحجز",
  MOVE_TO_TRASH: "نقل إلى السلة",
  PERMANENT_DELETE: "حذف نهائي",
};

/** Bookkeeping flags the caller must supply so money/inventory rules can apply. */
export interface BookingFlags {
  /** Outstanding amount the customer still owes. */
  remainingAmount?: number;
  /** Units still outside the warehouse (any return item not fully settled). */
  outsideQuantity?: number;
  /** Damaged/missing units not yet resolved. */
  unresolvedMissingCount?: number;
  /** Whether a DEPOSIT payment row exists (needed to accept/reject). */
  hasDepositPayment?: boolean;
}


export const actionLabel = (action: BookingAction): string => ACTION_LABELS[action];

const n = (v: number | undefined): number => (Number.isFinite(v as number) ? (v as number) : 0);

/**
 * The full permission matrix.
 *
 * Rules encoded here (see BOOKING_WORKFLOW_AUDIT.md):
 *  - ACCEPT / REJECT_AND_DELETE only for a new request that has a deposit row.
 *  - EDIT_DETAILS allowed while the request is under review and while a
 *    confirmed booking is still inside the warehouse (never after handover).
 *  - RECORD_BALANCE only before handover (the cash is taken at handover or
 *    during confirmation), never after the equipment is out.
 *  - HAND_OVER only from READY_FOR_PICKUP. An outstanding balance is allowed
 *    and recorded, but is surfaced as a warning.
 *  - START_RETURN only while equipment is out.
 *  - ADJUST_PRICE / RECORD_REFUND while equipment is out or awaiting return.
 *  - COMPLETE only when nothing is outside, nothing is missing and nothing is owed.
 *  - MOVE_TO_TRASH for anything that is not an active rental; active rentals
 *    must be returned first.
 *  - PERMANENT_DELETE only for a booking still under review (nothing reserved,
 *    no money verified yet); everything else must go through the trash.
 */
export function getAllowedActions(status: string, flags: BookingFlags = {}): BookingAction[] {
  const remaining = n(flags.remainingAmount);
  const outside = n(flags.outsideQuantity);
  const missing = n(flags.unresolvedMissingCount);
  const actions: BookingAction[] = [];

  const isReview = isRequestStatus(status);
  const active = isActiveRental(status);
  const out = isEquipmentOut(status);
  const closed = isClosed(status);

  if (isReview && flags.hasDepositPayment !== false) {
    actions.push("ACCEPT_REQUEST");
    actions.push("REJECT_AND_DELETE");
  }

  if (isReview || status === "CONFIRMED" || status === "READY_FOR_PICKUP") {
    actions.push("EDIT_DETAILS");
  }

  if ((status === "CONFIRMED" || status === "READY_FOR_PICKUP") && remaining > 0) {
    actions.push("RECORD_BALANCE");
  }

  if (status === "READY_FOR_PICKUP") {
    actions.push("HAND_OVER");
  }

  if (status === "EQUIPMENT_OUT") {
    actions.push("START_RETURN");
  }

  if (out) {
    actions.push("ADJUST_PRICE");
    actions.push("RECORD_REFUND");
  }

  if (status === "RETURN_PENDING" && outside === 0 && missing === 0 && remaining === 0) {
    actions.push("COMPLETE");
  }

  // A live rental cannot be trashed/erased; close the return first.
  if (!active && !closed && !isReview) {
    actions.push("MOVE_TO_TRASH");
  }

  if (isReview && remaining === 0 && outside === 0) {
    actions.push("PERMANENT_DELETE");
  }

  return actions;
}

export const canPerform = (
  status: string,
  action: BookingAction,
  flags: BookingFlags = {},
): boolean => getAllowedActions(status, flags).includes(action);

/** The single action the admin is expected to take next. */
export function getNextAction(status: string, flags: BookingFlags = {}): BookingAction | null {
  if (isRequestStatus(status)) return "ACCEPT_REQUEST";
  if (status === "CONFIRMED") return "RECORD_BALANCE";
  if (status === "READY_FOR_PICKUP") return "HAND_OVER";
  if (status === "EQUIPMENT_OUT") return "START_RETURN";
  if (status === "RETURN_PENDING") {
    return canPerform(status, "COMPLETE", flags) ? "COMPLETE" : null;
  }
  return null;
}

/** Human-readable guidance shown next to the action bar. */
export function getNextStepHint(status: string, flags: BookingFlags = {}): string {
  switch (status) {
    case "PENDING_PAYMENT_REVIEW":
      return "اتصل بالعميل لتأكيد المعدات والتواريخ والمبلغ، ثم اقبل الطلب.";
    case "CONFIRMED":
      return n(flags.remainingAmount) > 0
        ? "سجّل دفعة الرصيد عند استلام العميل للمعدات، ثم سلّم المعدات."
        : "الطلب جاهز — سلّم المعدات للعميل عند حضوره.";
    case "READY_FOR_PICKUP":
      return "بانتظار تسليم المعدات للعميل.";
    case "EQUIPMENT_OUT":
      return "المعدات لدى العميل — ابدأ الإرجاع عند إعادتها.";
    case "RETURN_PENDING":
      return (
        blockingReason(status, flags) ??
        "تم إرجاع كل المعدات — أكمل الحجز."
      );
    case "COMPLETED":
      return "اكتمل الحجز.";
    case "PAYMENT_REJECTED":
      return "تم رفض الدفع — يمكنك استعادة الطلب أو حذفه من السلة.";
    default:
      return "";
  }
}

/** Why completion is impossible, or null when it is possible. */
export function blockingReason(status: string, flags: BookingFlags = {}): string | null {
  if (status !== "RETURN_PENDING") return null;
  const reasons: string[] = [];
  const outside = n(flags.outsideQuantity);
  const missing = n(flags.unresolvedMissingCount);
  const remaining = n(flags.remainingAmount);
  if (outside > 0) reasons.push(`${outside} وحدة لا تزال خارج المخزن`);
  if (missing > 0) reasons.push(`${missing} وحدة مفقودة غير محسومة`);
  if (remaining > 0) reasons.push(`مبلغ متبقٍ ${remaining} دج`);
  return reasons.length ? `لا يمكن إكمال الحجز: ${reasons.join("، ")}.` : null;
}

/** Early / on-time / late classification for a return. */
export type ReturnTiming = "EARLY" | "ON_TIME" | "LATE" | "UNKNOWN";

export const RETURN_TIMING_LABELS: Record<ReturnTiming, string> = {
  EARLY: "إرجاع مبكر",
  ON_TIME: "في الوقت",
  LATE: "إرجاع متأخر",
  UNKNOWN: "—",
};

export const RETURN_TIMING_STYLES: Record<ReturnTiming, string> = {
  EARLY: "bg-info/15 text-info",
  ON_TIME: "bg-success/15 text-success",
  LATE: "bg-red-500/15 text-red-300",
  UNKNOWN: "bg-white/5 text-gray-400",
};

/** One-day tolerance so a return on the same calendar day counts as on time. */
export function getReturnTiming(
  actualIso: string | null | undefined,
  expectedIso: string | null | undefined,
): ReturnTiming {
  if (!actualIso || !expectedIso) return "UNKNOWN";
  const actual = new Date(actualIso).getTime();
  const expected = new Date(expectedIso).getTime();
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return "UNKNOWN";
  const DAY = 24 * 60 * 60 * 1000;
  if (actual < expected - DAY) return "EARLY";
  if (actual > expected + DAY) return "LATE";
  return "ON_TIME";
}

/**
 * Server-side truth for a partially returned item: how many units must still be
 * outside. Mirrors `upsert_return_item` so the UI can never disagree with it.
 */
export function deriveRemainingOut(
  quantity: number,
  returnedGood: number,
  damaged: number,
  missing: number,
): number {
  return Math.max(0, n(quantity) - n(returnedGood) - n(damaged) - n(missing));
}

