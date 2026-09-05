import React from "react";
import { CalendarDays, PackageCheck, Receipt, BadgeCheck } from "lucide-react";

const steps = [
  { icon: CalendarDays, title: "اختر التاريخ" },
  { icon: PackageCheck, title: "اختر المعدات" },
  { icon: Receipt, title: "ارفع وصل الدفع" },
  { icon: BadgeCheck, title: "انتظر تأكيد الحجز" },
];

const HowItWorks: React.FC = () => (
  <section className="py-12 bg-gray-900 text-white">
    <h2 className="text-3xl font-semibold mb-6 text-center">كيف يتم الحجز؟</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        return (
          <div key={idx} className="flex flex-col items-center text-center">
            <Icon className="text-accent mb-4" size={48} />
            <p className="text-xl font-medium">{step.title}</p>
          </div>
        );
      })}
    </div>
  </section>
);

export default HowItWorks;
