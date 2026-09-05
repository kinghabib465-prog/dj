import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import EquipmentPreview from "../components/EquipmentPreview";
import HowItWorks from "../components/HowItWorks";
import { CheckCircle2, Tag, Clock } from "lucide-react";

const Home: React.FC = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gray-800 text-white py-20">
        <div className="container mx-auto flex flex-col-reverse md:flex-row items-center gap-8">
          <div className="md:w-1/2 text-center md:text-right">
            <h1 className="text-5xl font-bold mb-4">
              تأجير تجهيزات الأعراس والمناسبات
            </h1>
            <p className="text-lg mb-6">
              نوفر لك جميع المعدات اللازمة لحفلاتك ومناسباتك بأعلى جودة وبأسعار مناسبة.
            </p>
            <div className="flex flex-col sm:flex-row justify-center md:justify-end gap-4">
              <Link
                to="/booking"
                className="bg-accent text-gray-900 px-6 py-3 rounded-full font-semibold hover:bg-accent/90"
              >
                حجز الآن
              </Link>
              <Link
                to="/equipment"
                className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-full font-semibold"
              >
                استعراض المعدات
              </Link>
            </div>
            <div className="md:w-1/2 flex justify-center">
              {/* Placeholder visual */}
              <div className="w-64 h-64 bg-gray-700 rounded-full flex items-center justify-center">
                <div className="w-12 h-12 bg-accent rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature indicators */}
      <section className="flex flex-col md:flex-row justify-center items-center gap-6 py-8 bg-gray-800">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="text-success" size={24} />
          <span>مراجعة الطلب</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-accent rounded-full"></div>
          <span>متاح اليوم</span>
        </div>
        <div className="flex items-center space-x-2">
          <Tag className="text-warning" size={24} />
          <span>التاريخ</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="text-info" size={24} />
          <span>الدفعة</span>
        </div>
      </section>

      {/* Equipment preview */}
      <EquipmentPreview />

      {/* How it works */}
      <HowItWorks />
    </Layout>
  );
};

export default Home;