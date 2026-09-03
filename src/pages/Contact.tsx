import React from "react";

const Contact: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-semibold mb-4">اتات بنا</h2>
      <p>للحجز أو الاستفسار، يرجى التواصل عبر الطرق التالية:</p>
      <ul className="list-disc pl-5 mt-2">
        <li>الهاتف: <span className="font-bold">[رقم الهاتف]</span></li>
        <li>واتساب: <span className="font-bold">[رقم الواتساب]</span></li>
        <li>العنوان: <span className="font-bold">[العنوان]</span></li>
      </ul>
    </div>
  );
};

export default Contact;
