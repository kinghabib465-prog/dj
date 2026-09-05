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
              ط¬ظ‡ظ‘ط² ظ…ظ†ط§ط³ط¨طھظƒ ط¨ظƒظ„ ط³ظ‡ظˆظ„ط©
            </h1>
            <p className="text-lg mb-6">
              ط§ط®طھط± ظ…ط¹ط¯ط§طھظƒطŒ ط­ط¯ظ‘ط¯ طھط§ط±ظٹط® ط§ظ„ظ…ظ†ط§ط³ط¨ط©طŒ ظˆط£ط±ط³ظ„ ط·ظ„ط¨ ط§ظ„ط­ط¬ط² ظپظٹ ط¯ظ‚ط§ط¦ظ‚.
            </p>
            <div className="flex flex-col sm:flex-row justify-center md:justify-end gap-4">
              <Link
                to="/booking"
                className="bg-accent text-gray-900 px-6 py-3 rounded-full font-semibold hover:bg-accent/90"
              >
                ط§ط¨ط¯ط£ ط§ظ„ط­ط¬ط²
              </Link>
              <Link
                to="/equipment"
                className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-full font-semibold"
              >
                ط§ط³طھط¹ط±ط¶ ط§ظ„ظ…ط¹ط¯ط§طھ
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
          <span>ط­ط¬ط² ط³ط±ظٹط¹</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-accent rounded-full"></div>
          <span>ظ…ط¹ط¯ط§طھ ظ…طھظ†ظˆط¹ط©</span>
        </div>
        <div className="flex items-center space-x-2">
          <Tag className="text-warning" size={24} />
          <span>ط£ط³ط¹ط§ط± ظˆط§ط¶ط­ط©</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="text-info" size={24} />
          <span>طھط£ظƒظٹط¯ ط¨ط¹ط¯ ظ…ط±ط§ط¬ط¹ط© ط§ظ„ط¯ظپط¹</span>
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