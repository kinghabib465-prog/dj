import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Plus, Loader2, CheckCircle2, ArrowRight, Upload, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout";

interface Category {
  id: string;
  name: string;
}

export default function EquipmentAdd() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [totalQuantity, setTotalQuantity] = useState(1);
  const [rentalPrice, setRentalPrice] = useState(0);
  const [depositPrice, setDepositPrice] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase
      .from("equipment_categories")
      .select("id,name")
      .order("sort_order", { ascending: true })
      .then(({ data }) => setCategories(data || []));
  }, []);

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setImgFile(f);
    setImgPreview(f ? URL.createObjectURL(f) : null);
  };

  const clearImage = () => {
    setImgFile(null);
    setImgPreview(null);
  };

  const slugify = (value: string) => {
    const base = value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/(^-+|-+$)/g, "");
    return `${base || "item"}-${Date.now().toString(36)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("أدخل اسم المعدة");
      return;
    }
    if (totalQuantity < 0 || rentalPrice < 0 || depositPrice < 0) {
      setError("الكمية والأسعار يجب أن تكون أرقاماً موجبة");
      return;
    }
    setSaving(true);
    try {
      let imagePath: string | null = null;
      if (imgFile) {
        const ext = imgFile.name.split(".").pop() || "jpg";
        const objPath = `equipment/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("equipment-images")
          .upload(objPath, imgFile, { contentType: imgFile.type, upsert: false });
        if (upErr) throw upErr;
        const pub = supabase.storage.from("equipment-images").getPublicUrl(objPath);
        imagePath = pub.data.publicUrl;
      }
      const { error: insErr } = await supabase.from("equipment").insert({
        name: name.trim(),
        slug: slugify(name),
        description: description.trim() || null,
        category_id: categoryId || null,
        image_path: imagePath,
        total_quantity: totalQuantity,
        rental_price: rentalPrice,
        deposit_price: depositPrice,
        is_active: isActive,
      });
      if (insErr) throw insErr;
      setDone(true);
    } catch (err) {
      console.error(err);
      setError("تعذر حفظ المعدة — تحقق من البيانات والصلاحيات");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDone(false);
    setName("");
    setDescription("");
    setCategoryId("");
    setTotalQuantity(1);
    setRentalPrice(0);
    setDepositPrice(0);
    clearImage();
  };

  const inputCls =
    "mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-accent";

  if (done) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckCircle2 size={56} className="text-success" />
          <h2 className="mt-4 text-2xl font-bold">تمت إضافة المعدة بنجاح</h2>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate("/admin/equipment-inside")}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-gray-900 hover:bg-accent/90"
            >
              عرض المعدات الداخلية
            </button>
            <button
              onClick={resetForm}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
            >
              إضافة معدة أخرى
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowRight size={16} />
        رجوع
      </button>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Plus size={24} className="text-accent" />
        إضافة معدة جديدة
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
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
          {imgPreview ? (
            <div className="relative mt-2 inline-block">
              <img src={imgPreview} alt="معاينة" className="h-32 w-32 rounded-lg object-cover" />
              <button
                type="button"
                onClick={clearImage}
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-8 text-sm text-gray-400 hover:border-accent/50">
              <Upload size={20} className="mb-2 text-accent" />
              اضغط لاختيار صورة (JPG / PNG / WEBP)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={pickImage}
                className="hidden"
              />
            </label>
          )}
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
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {saving ? "جاري الحفظ…" : "حفظ المعدة"}
        </button>
      </form>
    </AdminLayout>
  );
}