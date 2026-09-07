import React,{useState,useEffect}from"react";
import{supabase}from"../lib/supabase";
import{X,Upload,User,Phone,Calendar}from"lucide-react";

type Eq={id:string;name:string;image_path:string|null;rental_price:number;total_quantity:number};
export default function NewBookingWizardV2(){
  const[fullName,setFullName]=useState("");
  const[phone,setPhone]=useState("");
  const[sd,setSd]=useState<string | null>(null);
  const[ed,setEd]=useState<string | null>(null);
  const[eqs,setEqs]=useState<Eq[]>([]);
  const[sel,setSel]=useState<Record<string,number>>({});
  const[rec,setRec]=useState<File|null>(null);
  const[recPath,setRecPath]=useState("");
  const[load,setLoad]=useState(false);
  const[err,setErr]=useState<string|null>(null);
  const[ok,setOk]=useState<string|null>(null);
  const[inv,setInv]=useState<Record<string,number>>({});
  useEffect(()=>{supabase.from("equipment").select("id,name,image_path,rental_price,total_quantity").eq("is_active",true).then(r=>setEqs(r.data as Eq[]))},[]);
  useEffect(()=>{if(!sd||!ed){setInv({});return}supabase.from("inventory_status").select("equipment_id,total_quantity,outside_quantity").then(r=>{const m:Record<string,number>={};(r.data as any[]).forEach(v=>{m[v.equipment_id]=Math.max(0,v.total_quantity-v.outside_quantity)});setInv(m)});},[sd,ed]);
  const toggle = (id: string) => setSel(p => {
  const c = { ...p };
  const eq = eqs.find(e => e.id === id);
  const available = inv[id] ?? (eq?.total_quantity ?? 0);
  if (c[id]) delete c[id];
  else if (available > 0) c[id] = 1;
  return c;
});
  const qty = (id: string, delta: number) => setSel(p => {
  const cur = p[id] ?? 0;
  const eq = eqs.find(e => e.id === id);
  const available = inv[id] ?? (eq?.total_quantity ?? 0);
  const n = cur + delta;
  if (n < 1 || n > available) return p;
  return { ...p, [id]: n };
});
  const fileChange=(e: React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;setRec(f);supabase.functions.invoke("create-receipt-upload",{body:{fileName:f.name,fileType:f.type}}).then(r=>{if(r.error)throw r.error;const{signedUrl,path}=r.data as any;fetch(signedUrl,{method:"PUT",headers:{"Content-Type":f.type},body:f});setRecPath(path)})};
  const submit = async () => {
     const trimmedName = fullName.trim();
     const trimmedPhone = phone.trim();
     if (!trimmedName || !trimmedPhone || !sd || !ed || !recPath) {
       setErr("املأ جميع الحقول");
       return;
     }
     if (!/^[0-9]{7,15}$/ .test(trimmedPhone)) {
       setErr("رقم الهاتف غير صالح");
       return;
     }
       setLoad(true);
       setErr(null);
       try {
      const items = Object.entries(sel).map(([id, q]) => ({
        equipmentId: id,
        quantity: q,
      }));
      await supabase.functions.invoke("create-public-booking", {
        body: {
          customerName: trimmedName,
          customerPhone: trimmedPhone,
          rentalStartAt: sd,
          expectedReturnAt: ed,
          receiptObjectPath: recPath,

          items,
        },
      });
      setOk("تم إرسال طلب الحجز بنجاح");
      // reset
      setFullName("");
      setPhone("");
      setSd(null);
      setEd(null);
      setSel({});
      setRec(null);
      setRecPath("");
    } catch (e: any) {
      setErr(e.message || "خطأ");
    } finally {
      setLoad(false);
    }
  };

  return (
    <div dir="rtl" className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-lg space-y-4">
      <div>
        {err && <p>{err}</p>}
        {ok && <p>{ok}</p>}
        {/* Full name */}
        <div className="flex items-center border rounded px-3 py-2">
          <User className="mr-2 text-gray-500" />
          <input
            type="text"
            placeholder="الاسم واللقب"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
/* name-input */
            className="flex-1 outline-none"
          />
        </div>

        {/* Phone */}
        <div className="flex items-center border rounded px-3 py-2">
          <Phone className="mr-2 text-gray-500" />
          <input
            type="tel"
            placeholder="رقم الهاتف"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 outline-none"
          />
        </div>

        {/* Date */}
        <div className="flex items-center border rounded px-3 py-2">
          <Calendar className="mr-2 text-gray-500" />
          <input
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={sd || ""}
            onChange={(e) => { const val = e.target.value || null; setSd(val); setEd(val); }}
            className="flex-1 outline-none"
          />
        </div>

        {/* Equipment */}
        <div>
          <label className="block mb-2 font-medium">المعدات المطلوبة</label>
          <div className="grid grid-cols-2 gap-3">
            {eqs.map(eq => {
              const av = inv[eq.id] || eq.total_quantity;
              const selected = !!sel[eq.id];
              const quantity = sel[eq.id] || 0;
              return (
                <div
                  key={eq.id}
                  className={`border rounded p-3 cursor-pointer ${selected ? "border-accent bg-accent/10" : "border-gray-600"}`}
                  onClick={() => toggle(eq.id)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{eq.name}</span>
                    <span className="text-sm text-gray-600">{eq.rental_price.toLocaleString('ar-EG')} دج</span>
                  </div>
                  {selected && av > 1 && (
                    <div className="flex items-center mt-2 space-x-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); qty(eq.id, -1); }}
                        className="w-6 h-6 flex items-center justify-center border rounded"
                      >
                        -
                      </button>
                      <span>{quantity}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); qty(eq.id, 1); }}
                        className="w-6 h-6 flex items-center justify-center border rounded"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Receipt upload */}
        <div>
          <label className="block mb-2 font-medium">صورة وصل العربون</label>
          <div className="border-dashed border-gray-600 p-4 rounded text-center">
            <input
              type="file"
              accept="image/*"
              onChange={fileChange}
              className="hidden"
              id="receipt-upload"
            />
            <label htmlFor="receipt-upload" className="cursor-pointer">
              <Upload className="mx-auto text-accent" size={48} />
              <span className="block">انقر لتحميل صورة الفاتورة</span>
            </label>
            {rec && (
              <div className="mt-2 flex items-center justify-center space-x-2">
                <span>{rec.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setRec(null);
                    setRecPath("");
                  }}
                  className="text-red-500"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={load}
          className="w-full bg-accent text-white py-2 rounded hover:bg-accent/90 disabled:opacity-50"
        >
          {load ? "جاري الإرسال…" : "إرسال طلب الحجز"}
        </button>
      </div>
    <style>{`
      input, textarea {
        background-color: white;
        color: black;
      }
    `}</style>
    </div>
  );
}






