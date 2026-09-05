import React,{useState,useEffect}from"react";
import{supabase}from"../lib/supabase";
import{X,Upload}from"lucide-react";
import RentalCalendar from"./RentalCalendar";

type Eq={id:string;name:string;image_path:string|null;rental_price:number;total_quantity:number};
export default function NewBookingWizard(){
  const[step,setStep]=useState(0);
  const[fn,setFn]=useState("");
  const[ln,setLn]=useState("");
  const[ph,setPh]=useState("");
  const[sd,setSd]=useState("");
  const[ed,setEd]=useState("");
  const[eqs,setEqs]=useState<Eq[]>([]);
  const[sel,setSel]=useState<Record<string,number>>({});
  const[rec,setRec]=useState<File|null>(null);
  const[recPath,setRecPath]=useState("");
  const[load,setLoad]=useState(false);
  const[err,setErr]=useState<string|null>(null);
  const[ok,setOk]=useState<string|null>(null);
  const[inv,setInv]=useState<Record<string,number>>({});
  useEffect(()=>{supabase.from("equipment").select("id,name,image_path,rental_price,total_quantity").eq("is_active",true).then(r=>setEqs(r.data as Eq[]))},[]);
  useEffect(()=>{if(!sd||!ed){setInv({});return}supabase.from("inventory_status").select("equipment_id,total_quantity,outside_quantity").then(r=>{const m:Record<string,number>={};(r.data as any[]).forEach(v=>{m[v.equipment_id]=Math.max(0,v.total_quantity-r.outside_quantity)});setInv(m)});},[sd,ed]);
  const toggle=id=>setSel(p=>{const c={...p};if(c[id])delete c[id];else if((inv[id]||0)>0)c[id]=1;return c});
  const qty=(id,delta)=>setSel(p=>{const cur=p[id]||0;const a=inv[id]||0;const n=cur+delta;if(n<1||n>a)return p;return{...p,[id]:n}});
  const fileChange=e=>{const f=e.target.files?.[0];if(!f)return;setRec(f);supabase.functions.invoke("create-receipt-upload",{body:{fileName:f.name,fileType:f.type}}).then(r=>{if(r.error)throw r.error;const{signedUrl,path}=r.data as any;fetch(signedUrl,{method:"PUT",headers:{"Content-Type":f.type},body:f});setRecPath(path)})};
  const submit=async()=>{if(!fn||!ln||!ph||!sd||!ed||!recPath){setErr("املأ جميع الحقول");return}setLoad(true);setErr(null);try{const items=Object.entries(sel).map(([id,q])=>({equipmentId:id,quantity:q}));await supabase.functions.invoke("create-public-booking",{body:{customerName:`${fn} ${ln}`,customerPhone:ph,rentalStartAt:sd,expectedReturnAt:ed,receiptObjectPath:recPath,notes:"",items}});setOk("تم إرسال طلب الحجز بنجاح");setFn("");setLn("");setPh("");setSd("");setEd("");setSel({});setRec(null);setRecPath("");setStep(0)}catch(e:any){setErr(e.message||"خطأ")}finally{setLoad(false)}};
  const renderStep = () => {
    if (step === 0) {
      return <RentalCalendar startDate={sd} endDate={ed} setStartDate={setSd} setEndDate={setEd} />;
    }
    if (step === 1) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {eqs.map(eq => {
            const av = inv[eq.id] || eq.total_quantity;
            const selc = !!sel[eq.id];
            return (
              <div key={eq.id} className={`border p-1 ${selc ? "border-accent" : "border-gray-600"} flex flex-col items-center`}>
                <img src={eq.image_path || ""} alt={eq.name} className="w-full h-20 object-cover mb-1" />
                <p>{eq.name}</p>
                <p>{eq.rental_price.toLocaleString()} دج</p>
                <p>متوفر:{av}</p>
                {selc ? (
                  <div className="flex items-center space-x-1">
                    <button onClick={() => qty(eq.id, -1)}>-</button>
                    <span>{sel[eq.id]}</span>
                    <button onClick={() => qty(eq.id, 1)}>+</button>
                    <button onClick={() => toggle(eq.id)}><X size={16} /></button>
                  </div>
                ) : (
                  <button onClick={() => toggle(eq.id)}>اختر</button>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    if (step === 2) {
      return (
        <div className="grid md:grid-cols-2 gap-2">
          <div>
            <label>الاسم</label>
            <input type="text" value={fn} onChange={e => setFn(e.target.value)} />
            <div>
              <label>اللقب</label>
              <input type="text" value={ln} onChange={e => setLn(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label>رقم الهاتف</label>
              <input type="tel" value={ph} onChange={e => setPh(e.target.value)} />
            </div>
          </div>
        </div>
      );
    }
    if (step === 3) {
      return (
        <div className="flex flex-col items-center">
          <label>ارفع وصل الدفع</label>
          <div className="border-dashed border-gray-600 p-4 rounded">
            <input type="file" accept="image/*" onChange={fileChange} className="hidden" id="rec" />
            <label htmlFor="rec" className="flex flex-col items-center">
              <Upload className="text-accent" size={48} />
              <span>انقر لتحميل صورة الفاتورة</span>
              {rec && <span>{rec.name}</span>}
            </label>
          </div>
        </div>
      );
    }
    if (step === 4) {
      return (
        <div>
          <h3>مراجعة الطلب</h3>
          <div>
            <p>من {sd} إلى {ed}</p>
            <p>{fn} {ln}</p>
            <p>{ph}</p>
            <p>المعدات:</p>
            <ul>
              {Object.entries(sel).map(([id, q]) => {
                const eq = eqs.find(e => e.id === id);
                return (
                  <li key={id}>
                    {eq?.name} – {q} × {eq?.rental_price?.toLocaleString()} دج
                  </li>
                );
              })}
            </ul>
          </div>
          <button onClick={submit} disabled={load}>
            {load ? "جاري الإرسال…" : "إرسال"}
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-3xl mx-auto bg-gray-900 p-4 rounded">
      <div>
        {err && <p>{err}</p>}
        {ok && <p>{ok}</p>}
        {renderStep()}
      </div>
    </div>
  );
}