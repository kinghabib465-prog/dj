/*FULL*/
import { supabase } from "../lib/supabase";
import { User, UserRound, Phone, ImageUp, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

type Eq = { id: string; name: string; image_path: string | null; rental_price: number; total_quantity: number };
type Item = { equipmentId: string; quantity: number };

const steps = ["التاريخ", "المعدات", "معلوماتك", "رفع الفاتورة", "تأكيد الحجز"];

export default function BookingWizard() {
  const [step, setStep] = useState(0);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [eqs, setEqs] = useState<Eq[]>([]);
  const [inv, setInv] = useState<Record<string, number>>({});
  const [sel, setSel] = useState<Record<string, number>>({});
  const [fn, setFn] = useState("");
  const [ln, setLn] = useState("");
  const [ph, setPh] = useState("");
  const [rec, setRec] = useState<File | null>(null);
  const [recPath, setRecPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // fetch equipment once
  useEffect(() => {
    const f = async () => {
      const { data, error } = await supabase.from("equipment").select("id,name,image_path,rental_price,total_quantity").eq("is_active", true);
      if (error) console.error(error);
      else setEqs(data as Eq[]);
    };
    f();
  }, []);

    // fetch inventory when dates change
  useEffect(() => {
    if (!start || !end) {
      setInv({});
      return;
    }
    const f = async () => {
      const { data, error } = await supabase.from("inventory_status").select("equipment_id,total_quantity,outside_quantity");
      if (error) console.error(error);
      else {
        const map: Record<string, number> = {};
        (data as any[]).forEach(r => {
          map[r.equipment_id] = Math.max(0, r.total_quantity - r.outside_quantity);
        });
        setInv(map);
      }
    };
    f();
  }, [start, end]);

    const toggle = (id: string) => {
    setSel(prev => {
      const copy = { ...prev };
      if (copy[id]) delete copy[id];
      else if ((inv[id] || 0) > 0) copy[id] = 1;
      return copy;
    });
  };
  const qty = (id: string, delta: number) => {
    setSel(prev => {
      const cur = prev[id] || 0;
      const avail = inv[id] || 0;
      const nxt = cur + delta;
      if (nxt < 1 || nxt > avail) return prev;
      return { ...prev, [id]: nxt };
    });
  };
  const fileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setRec(f);
    try {
      const { data, error } = await supabase.functions.invoke("create-receipt-upload", { body: { fileName: f.name, fileType: f.type } });
      if (error) throw error;
      const { signedUrl, path } = data as any;
      await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": f.type }, body: f });
      setRecPath(path);
    } catch (e: any) {
      setError(e.message || "فشل رفع الفاتورة");
    }
  };
    const submit = async () => {
    if (!fn || !ln || !ph || !start || !end) {
      setError("املأ جميع الحقول");
      return;
    }
    if (Object.keys(sel).length === 0) {
      setError("اختر معدات");
      return;
    }
    if (!recPath) {
      setError("ارفع الفاتورة");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items: Item[] = Object.entries(sel).map(([id, q]) => ({ equipmentId: id, quantity: q }));
      const { data, error } = await supabase.functions.invoke("create-public-booking", {
        body: {
          customerName: `${fn} ${ln}`,
          customerPhone: ph,
          rentalStartAt: start,
          expectedReturnAt: end,
          receiptObjectPath: recPath,
          notes: "",
          items,
        },
      });
      if (error) throw error;
      const b = data as any;
      setSuccess(`✅ تم الحجز! رقم الحجز: ${b.bookingNumber}`);
      // reset
      setFn("");
      setLn("");
      setPh("");
      setStart("");
      setEnd("");
      setSel({});
      setRec(null);
      setRecPath("");
      setStep(0);
    } catch (e: any) {
      setError(e.message || "فشل الحجز");
    } finally {
      setLoading(false);
    }
  };
    const total = () => {
    return Object.entries(sel).reduce((sum, [id, q]) => {
      const eq = eqs.find(e => e.id === id);
      return sum + (eq?.rental_price || 0) * q;
    }, 0);
  };

  const renderStep = () => {
    // renderStep implementation will be inserted here
        switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <label className="block">تاريخ الاستلام</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full p-2 rounded bg-gray-200" required />
            <label className="block">تاريخ الإرجاع</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full p-2 rounded bg-gray-200" required />
          </div>
        );
      case 1:
        return (
          <div className="grid grid-cols-2 gap-2">
            {eqs.map(eq => {
              const selected = !!sel[eq.id];
              const avail = inv[eq.id] ?? 0;
              const disabled = avail <= 0;
              return (
                <div
                  key={eq.id}
                  className={`border p-1 rounded ${selected ? "border-accent bg-gray-800" : "border-gray-600"} ${disabled ? "opacity-50" : ""}`}
                  onClick={() => !disabled && toggle(eq.id)}
                >
                  {eq.image_path ? (
                    <img src={eq.image_path} alt={eq.name} className="w-full h-16 object-cover mb-1" />
                  ) : (
                    <div className="w-full h-16 bg-gray-300 mb-1 flex items-center justify-center">
                      <span className="text-gray-500">لا صورة</span>
                    </div>
                  )}
                  <p>{eq.name}</p>
                  <p>{eq.rental_price} دج</p>
                  <p>متوفر: {avail}</p>
                  {selected && (
                    <div className="flex items-center space-x-2">
                      <button onClick={e => { e.stopPropagation(); qty(eq.id, -1); }} className="px-1 bg-gray-300 rounded">-</button>
                      <span>{sel[eq.id]}</span>
                      <button onClick={e => { e.stopPropagation(); qty(eq.id, 1); }} className="px-1 bg-gray-300 rounded">+</button>
                    </div>
                  )}
                  {selected && <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 text-accent" />}
                  {disabled && (
                    <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
                      <span className="text-red-600 text-xs">غير متوفر</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              <input type="text" placeholder="الاسم" value={fn} onChange={e => setFn(e.target.value)} className="flex-1 p-2 rounded bg-gray-200" required />
            </div>
            <div className="flex items-center">
              <UserRound className="w-4 h-4 mr-2" />
              <input type="text" placeholder="اللقب" value={ln} onChange={e => setLn(e.target.value)} className="flex-1 p-2 rounded bg-gray-200" required />
            </div>
            <div className="flex items-center">
              <Phone className="w-4 h-4 mr-2" />
              <input type="tel" placeholder="رقم الهاتف" value={ph} onChange={e => setPh(e.target.value)} className="flex-1 p-2 rounded bg-gray-200" required />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center space-x-2">
            <ImageUp className="w-4 h-4" />
            <input type="file" accept="image/*" onChange={fileChange} className="flex-1" />
            {rec && (
              <div className="flex items-center space-x-2">
                <img src={URL.createObjectURL(rec)} alt="preview" className="w-16 h-16 object-cover" />
                <span>{rec.name}</span>
                <button onClick={() => { setRec(null); setRecPath(""); }} className="px-2 py-1 bg-red-300 rounded">إزالة</button>
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="space-y-2">
            <h3 className="font-bold">ملخص الحجز</h3>
            <p>{fn} {ln}</p>
            <p>{ph}</p>
            <p>{start} → {end}</p>
            {Object.entries(sel).map(([id, q]) => {
              const eq = eqs.find(e => e.id === id);
              if (!eq) return null;
              return (
                <div key={id} className="flex items-center">
                  {eq.image_path && <img src={eq.image_path} alt={eq.name} className="w-8 h-8 mr-2" />}
                  <div className="flex-1">
                    <p>{eq.name}</p>
                    <p>{eq.rental_price} دج × {q} = {eq.rental_price * q} دج</p>
                  </div>
                </div>
              );
            })}
            <p className="font-bold">المجموع: {total()} دج</p>
            <button onClick={submit} disabled={loading} className="w-full py-2 bg-accent text-white rounded">
              {loading ? "جاري الإرسال…" : "إرسال الحجز"}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  };

import { supabase } from "../lib/supabase";

/**
 * نموذج حجز كامل وتفاعلي.
 * يستخدم Tailwind لتصميم جذاب ويُرسل البيانات إلى Supabase.
 */
const BookingWizard: React.FC = () => {
  // حقول النموذج
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [equipment, setEquipment] = useState("");
  const [date, setDate] = useState("");

  // حالة التحميل والنتائج
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // قائمة المعدات (يمكن استبدالها بقراءة من Supabase إذا أردت)
  const equipmentOptions = [
    { id: "camera", label: "كاميرا احترافية" },
    { id: "lights", label: "مجموعة إضاءة" },
    { id: "sound", label: "نظام صوتي" },
    { id: "stage", label: "منصة صغيرة" },
  ];

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setEquipment("");
    setDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // تحقق بسيط من صحة الإدخال
    if (!name || !email || !phone || !equipment || !date) {
      setErrorMsg("الرجاء ملء جميع الحقول.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert([
          {
            name,
            email,
            phone,
            equipment,
            rental_start_at: date,
            expected_return_at: date,
            status: "PENDING_PAYMENT_REVIEW",
          },
        ])
        .single();

      if (error) throw error;

      setSuccessMsg("✅ تم حجزك بنجاح! سيتم مراجعة طلبك قريبًا.");
      resetForm();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.message ?? "حدث خطأ غير متوقع أثناء حفظ الحجز. يرجى المحاولة مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto bg-white text-gray-800 p-6 rounded-lg shadow-lg space-y-4"
    >
      {/* عنوان النموذج */}
      <h2 className="text-2xl font-bold text-center text-white mb-4">
        حجز معدات الزفاف والفعاليات
      </h2>

      {/* رسائل النجاح / الخطأ */}
      {successMsg && (
        <p className="text-green-400 text-center font-medium">{successMsg}</p>
      )}
      {errorMsg && (
        <p className="text-red-400 text-center font-medium">{errorMsg}</p>
      )}

      {/* الحقول */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* الاسم */}
        <div>
          <label className="block text-gray-800 mb-1">الاسم الكامل</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="مثال: محمد علي"
            required
          />
        </div>

        {/* البريد الإلكتروني */}
        <div>
          <label className="block text-gray-800 mb-1">البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="example@domain.com"
            required
          />
        </div>

        {/* رقم الهاتف */}
        <div className="md:col-span-2">
          <label className="block text-gray-800 mb-1">رقم الهاتف</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="مثال: 0591234567"
            required
          />
        </div>

        {/* اختيار المعدات */}
        <div className="md:col-span-2">
          <label className="block text-gray-800 mb-1">المعدات المطلوبة</label>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            required
          >
            <option value="">-- اختر المعدات --</option>
            {equipmentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* تاريخ الحجز */}
        <div className="md:col-span-2">
          <label className="block text-gray-800 mb-1">تاريخ الحجز</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>
      </div>

      {/* زر الإرسال */}
      <div className="text-center mt-4">
        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-2 rounded font-semibold transition-colors ${
            loading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-accent hover:bg-yellow-600"
          }`}
        >
          {loading ? "جاري الإرسال…" : "إرسال الحجز"}
        </button>
      </div>
    </form>
  );
};

export default BookingWizard;
