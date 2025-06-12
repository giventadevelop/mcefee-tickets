import React from 'react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
        <div className="flex flex-col items-center md:items-start mb-6 md:mb-0">
          <img src="/images/side_images/malayalees_us-logo_text_us_star_logo_header.png" alt="Malayalees US Logo" className="w-32 mb-4" />
          <span className="font-semibold text-lg">Follow us</span>
          <a href="#" className="mt-2 text-gray-400 hover:text-white">
            <span className="sr-only">Facebook</span>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.675 0h-21.35C.6 0 0 .6 0 1.326v21.348C0 23.4.6 24 1.326 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.4 24 24 23.4 24 22.674V1.326C24 .6 23.4 0 22.675 0" />
            </svg>
          </a>
        </div>
        <div className="flex flex-col items-center md:items-start mb-6 md:mb-0">
          <span className="font-semibold text-lg mb-2">Main menu</span>
          <ul className="space-y-1">
            <li><a href="#" className="hover:underline">Home</a></li>
            <li><a href="#" className="hover:underline">About</a></li>
            <li><a href="#" className="hover:underline">Events</a></li>
            <li><a href="#" className="hover:underline">Team</a></li>
            <li><a href="#" className="hover:underline">Contact</a></li>
          </ul>
        </div>
        <div className="flex flex-col items-center md:items-start">
          <span className="font-semibold text-lg mb-2">Contacts</span>
          <span>Unite India</span>
          <span>New Jersey, USA</span>
          <a href="tel:+16317088442" className="text-blue-400 hover:underline">+1 (631) 708-8442</a>
        </div>
      </div>
      <div className="text-center text-gray-400 mt-8">
        © 2025 United Team India. All rights reserved.
      </div>
    </footer>
  );
}