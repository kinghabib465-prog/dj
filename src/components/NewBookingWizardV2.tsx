import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import {
  AlertCircle,
  Boxes,
  CalendarDays,
  Check,
  Loader2,
  Phone,
  Upload,
  User,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Eq = {
  id: string;
  name: string;
  image_path: string | null;
  rental_price: number;
  total_quantity: number;
};

const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString("en-US") : "0");

const SUBMIT_ERRORS: Record<string, string> = {
  INVALID_REQUEST: "بيانات الطلب غير مكتملة، تأكد من تعبئة كل الحقول.",
  INVALID_RENTAL_PERIOD: "فترة الإيجار غير صالحة، راجع التواريخ المختارة.",
  INSUFFICIENT_AVAILABILITY: "الكمية المطلوبة غير متوفرة في الفترة المختارة.",
  NO_EQUIPMENT_SELECTED: "اختر معدات واحدة على الأقل.",
  SERVER_ERROR: "حدث خطأ في الخادم، حاول مرة أخرى.",
  SUBMIT_NETWORK:
    "تعذر الاتصال بخادم الحجز — تأكد من نشر الدالة بأحدث إصدار: npx supabase functions deploy create-public-booking",
};

const UPLOAD_ERRORS: Record<string, string> = {
  INVALID_FILE_TYPE: "صيغة الملف غير مدعومة للرفع (JPG / PNG / WEBP فقط).",
  MISSING_SECRET_KEY: "خطأ في إعدادات الخادم (مفتاح التخزين مفقود)، تواصل مع المسؤول.",
  SUPABASE_CLIENT_CREATION_ERROR: "خطأ في إعدادات الخادم، تواصل مع المسؤول.",
  UPLOAD_URL_ERROR: "تعذر إنشاء رابط الرفع، حاول مرة أخرى.",
  HANDLER_ERROR: "خطأ غير متوقع في الخادم، حاول مرة أخرى.",
  BAD_UPLOAD_RESPONSE: "استجابة غير صالحة من خادم الرفع، حاول مرة أخرى.",
  STORAGE_PUT_FAILED: "تعذر رفع الملف إلى التخزين، تحقق من الاتصال وحاول مرة أخرى.",
  UPLOAD_FAILED: "فشل رفع وصل العربون، حاول مرة أخرى.",
  NETWORK_OR_CORS:
    "تعذر الاتصال بخادم الرفع — تأكد من نشر الدالة بأحدث إصدار: npx supabase functions deploy create-receipt-upload",
};

export default function NewBookingWizardV2() {
  const navigate = useNavigate();

  // Customer
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Rental period
  const [sd, setSd] = useState<string | null>(null);
  const [ed, setEd] = useState<string | null>(null);

  // Equipment
  const [eqs, setEqs] = useState<Eq[]>([]);
  const [eqsLoading, setEqsLoading] = useState(true);
  const [eqsError, setEqsError] = useState<string | null>(null);
  const [sel, setSel] = useState<Record<string, number>>({});
  const [inv, setInv] = useState<Record<string, number>>({});
  const [brokenImgs, setBrokenImgs] = useState<Record<string, boolean>>({});

  // Receipt
  const [rec, setRec] = useState<File | null>(null);
  const [recPath, setRecPath] = useState("");
  const [uploading, setUploading] = useState(false);

  // Submit
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchEquipment = async () => {
    setEqsLoading(true);
    setEqsError(null);
    const { data, error } = await supabase
      .from("equipment")
      .select("id,name,image_path,rental_price,total_quantity")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error || !data) {
      setEqs([]);
      setEqsError("تعذر تحميل المعدات، تحقق من الاتصال ثم أعد المحاولة.");
    } else {
      setEqs(data as Eq[]);
    }
    setEqsLoading(false);
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  // Server-authoritative availability for the selected period.
  useEffect(() => {
    if (!sd || !ed) {
      setInv({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("inventory_status")
        .select("equipment_id,total_quantity,outside_quantity");
      if (cancelled) return;
      if (error || !data) {
        setInv({});
        return;
      }
      const m: Record<string, number> = {};
      (data as any[]).forEach((v) => {
        m[v.equipment_id] = Math.max(0, (v.total_quantity ?? 0) - (v.outside_quantity ?? 0));
      });
      setInv(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [sd, ed]);

  const availableFor = (eq: Eq): number => {
    if (sd && ed && inv[eq.id] !== undefined) return inv[eq.id];
    return eq.total_quantity ?? 0;
  };

  const toggle = (id: string) =>
    setSel((p) => {
      const c = { ...p };
      const eq = eqs.find((e) => e.id === id);
      if (!eq) return p;
      if (c[id]) {
        delete c[id];
        return c;
      }
      if (availableFor(eq) <= 0) return p;
      return { ...p, [id]: 1 };
    });

  const qty = (id: string, delta: number) =>
    setSel((p) => {
      const cur = p[id] ?? 0;
      const eq = eqs.find((e) => e.id === id);
      if (!eq) return p;
      const n = cur + delta;
      if (n < 1 || n > availableFor(eq)) return p;
      return { ...p, [id]: n };
    });

  const days = useMemo(() => {
    if (!sd || !ed) return 0;
    const diff = Math.ceil((new Date(ed).getTime() - new Date(sd).getTime()) / 86400000) + 1;
    return Math.max(1, diff);
  }, [sd, ed]);

  const total = useMemo(
    () =>
      Object.entries(sel).reduce((sum, [id, q]) => {
        const eq = eqs.find((e) => e.id === id);
        return eq ? sum + q * (eq.rental_price ?? 0) * days : sum;
      }, 0),
    [sel, eqs, days]
  );

  const today = new Date().toISOString().split("T")[0];

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(f.type)) {
      setErr("صيغة الوصل غير مدعومة، استخدم JPG أو PNG أو WEBP.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErr("حجم الصورة كبير جداً، الحد الأقصى 5 ميغابايت.");
      return;
    }
    setErr(null);
    setRec(f);
    setRecPath("");
    setUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-receipt-upload", {
        body: { fileName: f.name, fileType: f.type },
      });
      if (error) {
        if (error instanceof FunctionsFetchError) {
          throw new Error("NETWORK_OR_CORS");
        }
        let code = "";
        if (error instanceof FunctionsHttpError) {
          try {
            const payload = await error.context.json();
            code = payload?.error ?? "";
          } catch {
            /* ignore */
          }
        }
        throw new Error(UPLOAD_ERRORS[code] ? code : code || "UPLOAD_FAILED");
      }
      // Accept both current and legacy response keys.
      const uploadUrl = (data as any)?.uploadUrl ?? (data as any)?.signedUrl;
      const objectPath = (data as any)?.objectPath ?? (data as any)?.path;
      if (!uploadUrl || !objectPath) throw new Error("BAD_UPLOAD_RESPONSE");
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": f.type },
        body: f,
      });
      if (!res.ok) throw new Error("STORAGE_PUT_FAILED");
      setRecPath(objectPath);
    } catch (e: any) {
      setRec(null);
      const code = e?.message ?? "";
      setErr(
        UPLOAD_ERRORS[code] ??
          `فشل رفع وصل العربون (${code || "خطأ غير معروف"}). حاول مرة أخرى.`
      );
    } finally {
      setUploading(false);
    }
  };

  const clearReceipt = () => {
    setRec(null);
    setRecPath("");
  };

  const submit = async () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone || !sd || !ed) {
      setErr("املأ الاسم والهاتف والتاريخ قبل الإرسال.");
      return;
    }
    if (!/^[0-9+\s-]{7,15}$/.test(trimmedPhone)) {
      setErr("رقم الهاتف غير صالح.");
      return;
    }
    if (Object.keys(sel).length === 0) {
      setErr("اختر معدات واحدة على الأقل.");
      return;
    }
    if (!recPath) {
      setErr(uploading ? "انتظر حتى يكتمل رفع الوصل." : "ارفع صورة وصل العربون قبل الإرسال.");
      return;
    }
    setLoad(true);
    setErr(null);
    try {
      const items = Object.entries(sel).map(([id, q]) => ({ equipmentId: id, quantity: q }));
      const { error } = await supabase.functions.invoke("create-public-booking", {
        body: {
          customerName: trimmedName,
          customerPhone: trimmedPhone,
          rentalStartAt: sd,
          expectedReturnAt: ed,
          receiptObjectPath: recPath,
          items,
        },
      });
      if (error) {
        if (error instanceof FunctionsFetchError) {
          throw new Error("SUBMIT_NETWORK");
        }
        let msg = SUBMIT_ERRORS.SERVER_ERROR;
        if (error instanceof FunctionsHttpError) {
          try {
            const payload = await error.context.json();
            msg = SUBMIT_ERRORS[payload?.error] ?? msg;
          } catch {
            /* keep default message */
          }
        }
        throw new Error(msg);
      }
      navigate("/booking/success");
    } catch (e: any) {
      setErr(e?.message || SUBMIT_ERRORS.SERVER_ERROR);
    } finally {
      setLoad(false);
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6">
      {/* Heading */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">احجز معدات مناسبتك</h2>
        <p className="mt-2 text-sm text-gray-400">
          بدون حساب — املأ بياناتك، اختر المعدات، وارفع وصل العربون وسنراجع طلبك.
        </p>
      </div>

      {/* Error banner */}
      {err && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
          <AlertCircle size={18} className="shrink-0" />
          <span className="text-sm">{err}</span>
        </div>
      )}

      <div className="space-y-8 rounded-2xl border border-gray-700 bg-gray-800/50 p-6 shadow-xl">
        {/* Customer info */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-accent">
            <User size={16} /> بيانات المستأجر
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                الاسم واللقب
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (err) setErr(null);
                }}
                placeholder="مثال: محمد بن علي"
                className="w-full rounded-lg border border-gray-700 bg-gray-900/60 px-4 py-2.5 text-white placeholder-gray-500 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                <Phone size={14} className="ml-1 inline text-accent" /> رقم الهاتف
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (err) setErr(null);
                }}
                placeholder="مثال: 0550123456"
                className="w-full rounded-lg border border-gray-700 bg-gray-900/60 px-4 py-2.5 text-white placeholder-gray-500 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
        </section>

        {/* Rental period */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-accent">
            <CalendarDays size={16} /> تاريخ أخذ المعدات
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                تاريخ أخذ المعدات
              </label>
              <input
                type="date"
                min={today}
                value={sd ?? ""}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setSd(v);
                  if (v && (!ed || ed <= v)) {
                    const next = new Date(v);
                    next.setDate(next.getDate() + 1);
                    setEd(next.toISOString().split("T")[0]);
                  }
                  if (err) setErr(null);
                }}
                className="w-full rounded-lg border border-gray-700 bg-gray-900/60 px-4 py-2.5 text-white outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <p className="text-xs text-gray-500 md:col-span-2">
              يُحتسب الإرجاع تلقائياً لليوم التالي، ويُتفق على الموعد النهائي مع الإدارة عند التسليم.
            </p>
          </div>
        </section>

        {/* Equipment */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-accent">
              <Boxes size={16} /> المعدات المطلوبة
            </h3>
            {Object.keys(sel).length > 0 && (
              <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
                {Object.keys(sel).length} مختارة
              </span>
            )}
          </div>

          {eqsLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-xl bg-gray-800" />
              ))}
            </div>
          ) : eqsError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-700 bg-gray-900/40 p-6 text-center">
              <p className="text-sm text-gray-400">{eqsError}</p>
              <button
                type="button"
                onClick={fetchEquipment}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-gray-900 hover:bg-accent/90"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : eqs.length === 0 ? (
            <p className="rounded-xl border border-gray-700 bg-gray-900/40 p-6 text-center text-sm text-gray-400">
              لا توجد معدات متاحة حالياً.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {eqs.map((eq) => {
                const selected = !!sel[eq.id];
                const quantity = sel[eq.id] ?? 0;
                const av = availableFor(eq);
                const soldOut = av <= 0;
                return (
                  <div
                    key={eq.id}
                    onClick={() => {
                      if (!soldOut) toggle(eq.id);
                    }}
                    className={`overflow-hidden rounded-xl border transition ${
                      selected
                        ? "border-accent bg-accent/10 ring-2 ring-accent/40"
                        : "border-gray-700 bg-gray-900/40 hover:border-gray-500"
                    } ${soldOut ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  >
                    <div className="relative h-24 bg-gray-800">
                      {eq.image_path && !brokenImgs[eq.id] ? (
                        <img
                          src={eq.image_path}
                          alt={eq.name}
                          className="h-full w-full object-cover"
                          onError={() => setBrokenImgs((p) => ({ ...p, [eq.id]: true }))}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-600">
                          <Boxes size={32} />
                        </div>
                      )}
                      {soldOut ? (
                        <span className="absolute right-2 top-2 rounded bg-red-500/90 px-2 py-0.5 text-xs font-bold text-white">
                          غير متاح
                        </span>
                      ) : selected ? (
                        <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-xs font-bold text-gray-900">
                          <Check size={12} /> مختارة
                        </span>
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-white" title={eq.name}>
                        {eq.name}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-gray-400">{fmt(eq.rental_price)} دج/يوم</span>
                        <span className={soldOut ? "text-red-400" : "text-success"}>
                          متوفر: {av}
                        </span>
                      </div>
                      {selected && av > 1 && (
                        <div className="mt-3 flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              qty(eq.id, -1);
                            }}
                            className="h-7 w-7 rounded-md border border-gray-600 text-white transition hover:bg-gray-700"
                            aria-label="إنقاص الكمية"
                          >
                            -
                          </button>
                          <span className="min-w-[1.5rem] text-center font-bold text-white">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              qty(eq.id, 1);
                            }}
                            disabled={quantity >= av}
                            className="h-7 w-7 rounded-md border border-gray-600 text-white transition hover:bg-gray-700 disabled:opacity-40"
                            aria-label="زيادة الكمية"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Receipt */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-accent">
            <Upload size={16} /> صورة وصل العربون
          </h3>
          <div className="rounded-xl border-2 border-dashed border-gray-600 bg-gray-900/40 p-5 text-center">
            <input
              id="receipt-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              className="hidden"
            />
            {rec ? (
              <div className="flex items-center justify-center gap-3">
                <img
                  src={URL.createObjectURL(rec)}
                  alt="وصل العربون"
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <div className="text-right">
                  <p className="max-w-[180px] truncate text-sm text-white">{rec.name}</p>
                  {uploading ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                      <Loader2 size={12} className="animate-spin" /> جاري الرفع…
                    </p>
                  ) : recPath ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-success">
                      <Check size={12} /> تم رفع الوصل بنجاح
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={clearReceipt}
                  disabled={uploading}
                  className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-700 hover:text-red-400 disabled:opacity-40"
                  aria-label="إزالة الوصل"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <label
                htmlFor="receipt-upload"
                className="flex cursor-pointer flex-col items-center gap-2 text-gray-400 transition hover:text-gray-300"
              >
                <Upload size={28} className="text-accent" />
                <span className="text-sm">انقر لاختيار صورة وصل العربون</span>
                <span className="text-xs text-gray-500">
                  JPG / PNG / WEBP — بحد أقصى 5 ميغابايت
                </span>
              </label>
            )}
          </div>
        </section>

        {/* Summary */}
        {Object.keys(sel).length > 0 && days > 0 && (
          <div className="space-y-2 rounded-xl border border-gray-700 bg-gray-900/60 p-4 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>عدد الأيام</span>
              <span className="font-semibold text-white">{days}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>عدد المعدات المختارة</span>
              <span className="font-semibold text-white">{Object.keys(sel).length}</span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-2 font-bold">
              <span className="text-white">الإجمالي التقريبي</span>
              <span className="text-accent">{fmt(total)} دج</span>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={submit}
          disabled={load || uploading}
          className="w-full rounded-xl bg-accent py-3 font-bold text-gray-900 transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {load ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" /> جاري إرسال الطلب…
            </span>
          ) : (
            "إرسال طلب الحجز"
          )}
        </button>
      </div>
    </div>
  );
}