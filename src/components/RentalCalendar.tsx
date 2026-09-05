import React, { useState, useEffect } from "react";
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  startDate: string | null;
  endDate: string | null;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
};

const RentalCalendar: React.FC<Props> = ({ startDate, endDate, setStartDate, setEndDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [days, setDays] = useState<Date[]>([]);

  const generateDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const last = new Date(year, month + 1, 0);
    const daysArray: Date[] = [];
    for (let i = 1; i <= last.getDate(); i++) {
      daysArray.push(new Date(year, month, i));
    }
    setDays(daysArray);
  };

  useEffect(() => {
    generateDays(currentMonth);
  }, [currentMonth]);

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  };

  const isSelected = (d: Date) => {
    const iso = d.toISOString().split("T")[0];
    return startDate === iso || endDate === iso;
  };

  const handleClick = (d: Date) => {
    const iso = d.toISOString().split("T")[0];
    if (!startDate) {
      setStartDate(iso);
    } else if (!endDate && iso > startDate) {
      setEndDate(iso);
    } else {
      // reset selection
      setStartDate(iso);
      setEndDate(null);
    }
  };

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-accent hover:text-accent/80"><ChevronLeft size={20} /></button>
        <h3 className="text-xl font-semibold">{currentMonth.toLocaleString("ar", { month: "long", year: "numeric" })}</h3>
        <button onClick={nextMonth} className="text-accent hover:text-accent/80"><ChevronRight size={20} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["ح","ن","ث","ر","خ","ج","س"].map((d,i) => (
          <div key={i} className="font-bold text-sm">{d}</div>
        ))}
        {days.map(d => {
          const iso = d.toISOString().split("T")[0];
          const selected = isSelected(d);
          const today = isToday(d);
          const base = "w-8 h-8 flex items-center justify-center rounded-full cursor-pointer";
          const bg = selected ? "bg-accent text-gray-900" : today ? "bg-gray-700" : "bg-gray-600";
          return (
            <button key={iso} className={`${base} ${bg}`} onClick={() => handleClick(d)}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
      {/* Legend */}
      <div className="mt-4 flex items-center space-x-4 text-sm">
        <div className="flex items-center"><span className="w-4 h-4 bg-accent rounded-full mr-1"></span>اختيارك</div>
        <div className="flex items-center"><span className="w-4 h-4 bg-gray-600 rounded-full mr-1"></span>متاح</div>
        <div className="flex items-center"><span className="w-4 h-4 bg-gray-700 rounded-full mr-1"></span>اليوم</div>
      </div>
    </div>
  );
};

export default RentalCalendar;