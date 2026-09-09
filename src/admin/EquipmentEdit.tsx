import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Pencil, Loader2, ArrowRight, Upload, X, AlertTriangle } from "lucide-react";
import AdminLayout from "../components/AdminLayout";

interface Category {
  id: string;
  name: string;
}

interface InvInfo {
  physical_outside_quantity: number;
  missing_quantity: number;
  damaged_quantity: number;
}

export default function EquipmentEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [rentalPrice, setRentalPrice] = useState(0);
  const [depositPrice, setDepositPrice] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [inv, setInv] = useState<InvInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: cats } = await supabase
        .from("equipment_categories")
        .select("id,name")
        .order("sort_order", { ascending: true });
      setCategories(cats || []);

      if (id) {
        const { data, error } = await supabase.from("equipment").select("*").eq("id", id).single();
        if (error || !data) {
          setError("المعدة غير موجودة");
          setLoading(false);
          return;
        }
        setName(data.name);
        setDescription(data.description || "");
        setCategoryId(data.category_id || "");
        setTotalQuantity(data.total_quantity);
        setRentalPrice(data.rental_price);
        setDepositPrice(data.deposit_price);
        setIsActive(data.is_active);
        setImagePath(data.image_path || null);
        const { data: invRow } = await supabase
          .from("inventory_status")
          .select("physical_outside_quantity,missing_quantity,damaged_quantity")
          .eq("equipment_id", id)
          .single();
        setInv(invRow || null);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setImgFile(f);
    setImgPreview(f ? URL.createObjectURL(f) : null);
  };

  const clearImage = () => {
    setImgFile(null);
    setImgPreview(null);
  };

  const extractObjPath = (url: string | null): string | null => {
    const marker = "/object/public/equipment-images/";
    if (url && url.includes(marker)) {
      try {
        return decodeURIComponent(url.split(marker)[1]);
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!id || !name.trim()) {
      setError("أدخل اسم المعدة");
      return;
    }
    const reserved = (inv?.physical_outside_quantity ?? 0) + (inv?.missing_quantity ?? 0) + (inv?.damaged_quantity ?? 0);
    if (totalQuantity < reserved) {
      setError(`الكمية الكلية لا يمكن أن تكون أقل من ${reserved} (خارج المتجر + مفقود + تالف)`);
      return;
    }
    setSaving(true);
    try {
      let newImagePath = imagePath;
      if (imgFile) {
        const ext = imgFile.name.split(".").pop() || "jpg";
        const objPath = `equipment/${id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("equipment-images")
          .upload(objPath, imgFile, { contentType: imgFile.type, upsert: false });
        if (upErr) throw upErr;
        newImagePath = supabase.storage.from("equipment-images").getPublicUrl(objPath).data.publicUrl;
      }
      const { error: upErr2 } = await supabase
        .from("equipment")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          category_id: categoryId || null,
          total_quantity: totalQuantity,
          rental_price: rentalPrice,
          deposit_price: depositPrice,
          is_active: isActive,
          image_path: newImagePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (upErr2) throw upErr2;
      const oldObj = extractObjPath(imagePath);
      if (imgFile && oldObj) {
        await supabase.storage.from("equipment-images").remove([oldObj]);
      }
      navigate("/admin/equipment-inside");
    } catch (err) {
      console.error(err);
      setError("تعذر حفظ التعديلات — تحقق من البيانات والصلاحيات");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-accent";

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <button
        onClick={() => navigate("/admin/equipment-inside")}
        className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowRight size={16} />
        رجوع إلى قائمة المعدات
      </button>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Pencil size={24} className="text-accent" />
        تعديل المعدة
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {inv && (
        <div className="mb-5 flex flex-wrap gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-xs">
          <span className="text-gray-400">
            خارج المتجر الآن: <b className="text-warning">{inv.physical_outside_quantity}</b>
          </span>
          <span className="text-gray-400">
            مفقود: <b className="text-red-400">{inv.missing_quantity}</b>
          </span>
          <span className="text-gray-400">
            تالف: <b className="text-red-400">{inv.damaged_quantity}</b>
          </span>
          <span className="text-gray-500">
            — الكمية الكلية يجب ألا تقل عن مجموعها ({(inv.physical_outside_quantity ?? 0) + (inv.missing_quantity ?? 0) + (inv.damaged_quantity ?? 0)})
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="max-w-2xl space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-300">اسم المعدة *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-gray-300">الكمية الكلية *</label>
            <input
              type="number"
              min={0}
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(Number(e.target.value))}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">سعر الإيجار / اليوم (دج) *</label>
            <input
              type="number"
              min={0}
              value={rentalPrice}
              onChange={(e) => setRentalPrice(Number(e.target.value))}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">سعر العربون (دج) *</label>
            <input
              type="number"
              min={0}
              value={depositPrice}
              onChange={(e) => setDepositPrice(Number(e.target.value))}
              className={inputCls}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-300">التصنيف</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
            <option value="">— بدون تصنيف —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-gray-900">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-300">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={inputCls}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-300">صورة المعدة</label>
          {(imgPreview || imagePath) && (
            <div className="relative mt-2 inline-block">
              <img
                src={imgPreview || imagePath || ""}
                alt="الصورة الحالية"
                className="h-32 w-32 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-6 text-sm text-gray-400 hover:border-accent/50">
            <Upload size={20} className="mb-2 text-accent" />
            {imgPreview ? "تغيير الصورة الجديدة" : imagePath ? "استبدال الصورة الحالية" : "اختيار صورة (JPG / PNG / WEBP)"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={pickImage}
              className="hidden"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          معروضة للعملاء (نشطة)
        </label>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Pencil size={18} />}
          {saving ? "جاري الحفظ…" : "حفظ التعديلات"}
        </button>
      </form>
    </AdminLayout>
  );
}