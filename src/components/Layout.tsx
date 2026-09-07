import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Home, Box, Calendar, Phone } from "lucide-react";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="bg-gray-900 min-h-screen flex flex-col text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-gray-900/80 shadow" dir="rtl">
        <nav className="container mx-auto flex items-center justify-between p-4">
          {/* Brand / Logo */}
          <Link to="/" className="text-2xl font-bold flex items-center space-x-2 rtl:space-x-reverse">
            <span className="text-accent">⚜️</span>
            <span>تأجير تجهيزات الأعراس والمناسبات</span>
          </Link>
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6 rtl:space-x-reverse">
            <Link to="/" className="hover:underline">الرئيسية</Link>
            <Link to="/equipment" className="hover:underline">المعدات</Link>
            <Link to="/booking" className="hover:underline">الحجز</Link>
            <Link to="/contact" className="hover:underline">تواصل معنا</Link>
            <Link to="/booking" className="bg-accent text-gray-900 px-4 py-2 rounded-full font-semibold hover:bg-accent/90">
              احجز الآن
            </Link>
          </div>
          {/* Mobile Hamburger */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-gray-800 p-4 space-y-3">
            <Link to="/" className="block hover:underline" onClick={() => setMenuOpen(false)}>الرئيسية</Link>
            <Link to="/equipment" className="block hover:underline" onClick={() => setMenuOpen(false)}>المعدات</Link>
            <Link to="/booking" className="block hover:underline" onClick={() => setMenuOpen(false)}>الحجز</Link>
            <Link to="/contact" className="block hover:underline" onClick={() => setMenuOpen(false)}>تواصل معنا</Link>
            <Link to="/booking" className="block bg-accent text-gray-900 text-center py-2 rounded-full font-semibold hover:bg-accent/90" onClick={() => setMenuOpen(false)}>
              احجز الآن
            </Link>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-grow container mx-auto p-6">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 p-4 text-center">
        <p>© {new Date().getFullYear()} تأجير تجهيزات الأعراس والمناسبات. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
};

export default Layout;
