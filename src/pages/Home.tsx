import React from "react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-4">مستأجرات الزفاف والفعاليات</h1>
      <p className="mb-6">نحن نوفر أحدث المعدات الصوتية والضوئية لتجربة لا تُنسى.</p>
      <Link to="/booking" className="bg-accent text-white px-6 py-3 rounded hover:bg-yellow-600">
        احجز الآن
      </Link>
    </div>
  );
};

export default Home;
