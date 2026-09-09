const ARABIC_INDIC: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

/** Convert Arabic-Indic digits (٠-٩) to Western digits (0-9) — for user-entered data like phones. */
export function toWesternDigits(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[٠-٩]/g, (c) => ARABIC_INDIC[c] ?? c);
}