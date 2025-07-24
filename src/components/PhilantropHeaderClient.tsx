"use client";
import { useState, useEffect } from "react";

export function PhilantropHeaderClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="header-transparent" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(5px)' }}>
        <div className="header-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px' }}>
          {/* <a href="/" className="logo" style={{ display: 'block' }}>
            <img src="/images/mcefee_logo_black_border_transparent.png" alt="MCEFEE Logo" style={{ width: 120, height: 'auto' }} />
          </a> */}
          <nav style={{ flex: 1 }}>
            <ul className="main-menu" style={{ display: 'flex', listStyle: 'none', justifyContent: 'flex-end', margin: 0, padding: 0 }}>
              <li style={{ margin: '0 20px' }}><a href="/" style={{ fontSize: 15, color: '#fff9c4', fontWeight: 'bold', padding: '10px 0', textDecoration: 'none' }}>Home</a></li>
              <li style={{ margin: '0 20px' }}><a href="/#about-us" style={{ fontSize: 15, color: '#fff9c4', fontWeight: 'bold', padding: '10px 0', textDecoration: 'none' }}>About</a></li>
              <li style={{ margin: '0 20px' }}><a href="/events" style={{ fontSize: 15, color: '#fff9c4', fontWeight: 'bold', padding: '10px 0', textDecoration: 'none' }}>Events</a></li>
              <li style={{ margin: '0 20px' }}><a href="/#team-section" style={{ fontSize: 15, color: '#fff9c4', fontWeight: 'bold', padding: '10px 0', textDecoration: 'none' }}>Team</a></li>
              <li style={{ margin: '0 20px' }}><a href="/#contact" style={{ fontSize: 15, color: '#fff9c4', fontWeight: 'bold', padding: '10px 0', textDecoration: 'none' }}>Contact</a></li>
            </ul>
            <button
              className="hamburger-menu"
              aria-label="Menu"
              style={{ display: 'none', width: 30, height: 24, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 16 }}
              onClick={() => setMobileMenuOpen(true)}
            >
              <span style={{ display: 'block', height: 2, background: 'white', margin: '6px 0' }}></span>
              <span style={{ display: 'block', height: 2, background: 'white', margin: '6px 0' }}></span>
              <span style={{ display: 'block', height: 2, background: 'white', margin: '6px 0' }}></span>
            </button>
          </nav>
        </div>
      </header>
      <div className={mobileMenuOpen ? 'mobile-menu active' : 'mobile-menu'}
        style={{ display: mobileMenuOpen ? 'block' : 'none', position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', background: 'rgba(0,0,0,0.95)', paddingTop: 80, zIndex: 999 }}>
        <ul className="mobile-menu-list" style={{ listStyle: 'none', textAlign: 'center', padding: 0, margin: 0 }}>
          <li><a href="/" style={{ color: '#fff9c4', fontWeight: 'bold', fontSize: 24, padding: 15, display: 'block', textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>Home</a></li>
          <li><a href="/#about-us" style={{ color: '#fff9c4', fontWeight: 'bold', fontSize: 24, padding: 15, display: 'block', textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>About</a></li>
          <li><a href="/events" style={{ color: '#fff9c4', fontWeight: 'bold', fontSize: 24, padding: 15, display: 'block', textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>Events</a></li>
          <li><a href="/#team-section" style={{ color: '#fff9c4', fontWeight: 'bold', fontSize: 24, padding: 15, display: 'block', textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>Team</a></li>
          <li><a href="/#contact" style={{ color: '#fff9c4', fontWeight: 'bold', fontSize: 24, padding: 15, display: 'block', textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>Contact</a></li>
        </ul>
        <button
          aria-label="Close menu"
          style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'white', fontSize: 32, cursor: 'pointer' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          &times;
        </button>
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          .main-menu {
            display: none !important;
          }
          .hamburger-menu {
            display: block !important;
          }
          .logo img {
            width: 100px !important;
          }
        }
        @media (max-width: 991px) {
          .logo img {
            width: 100px !important;
          }
        }
        .main-menu a {
          color: #fff9c4 !important;
        }
        .main-menu a:hover, .main-menu a:focus {
          color: #fffbe6;
        }
        .mobile-menu-list a {
          color: #fff9c4 !important;
        }
        .mobile-menu-list a:hover, .mobile-menu-list a:focus {
          color: #fffbe6;
        }
      `}</style>
    </>
  );
}