import React from "react";
import { Link } from "react-router-dom";

/**
 * Layout component that provides a consistent header, footer and page background.
 * Uses Tailwind colors defined in tailwind.config.js.
 */
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-primary min-h-screen flex flex-col">
    {/* Header */}
    <header className="bg-accent text-white p-4 shadow">
      <nav className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          Wedding Equipment Rental
        </Link>
        <ul className="flex space-x-4">
          <li><Link to="/" className="hover:underline">الرئيسية</Link></li>
          <li><Link to="/equipment" className="hover:underline">المعدات</Link></li>
          <li><Link to="/booking" className="hover:underline">الحجز</Link></li>
          <li><Link to="/contact" className="hover:underline">اتصل بنا</Link></li>
        </ul>
      </nav>
    </header>

    {/* Main content */}
    <main className="flex-grow container mx-auto p-6">{children}</main>

    {/* Footer */}
    <footer className="bg-gray-900 text-gray-400 p-4 text-center">
      <p>© {new Date().getFullYear()} Wedding Equipment Rental. جميع الحقوق محفوظة.</p>
    </footer>
  </div>
);

export default Layout;
