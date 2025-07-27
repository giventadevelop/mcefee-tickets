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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (mobileMenuOpen && !target.closest('.mobile-menu') && !target.closest('.hamburger-menu')) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (min-width: 768px) {
            .main-menu {
              display: flex !important;
            }
          }
          @media (max-width: 767px) {
            .main-menu {
              display: none !important;
            }
          }

          /* Override theme.css menu colors with higher specificity */
          .header-transparent .main-menu li a,
          .header-transparent .mobile-menu-list li a {
            color: #ffce59 !important;
            font-weight: bold !important;
          }

          .header-transparent .main-menu li a:hover,
          .header-transparent .mobile-menu-list li a:hover {
            color: #ffd700 !important;
          }
        `
      }} />
      <header className="header-transparent" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(5px)' }}>
        <div className="header-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px' }}>
          <nav style={{ flex: 1 }}>
            <ul className="main-menu" style={{
              listStyle: 'none',
              justifyContent: 'flex-end',
              margin: 0,
              padding: 0,
              display: 'none'
            }}>
              <li style={{ margin: '0 20px' }}><a href="/" style={{ fontSize: 15, padding: '10px 0', textDecoration: 'none', transition: 'color 0.3s ease' }}>Home</a></li>
              <li style={{ margin: '0 20px' }}><a href="/#about-us" style={{ fontSize: 15, padding: '10px 0', textDecoration: 'none', transition: 'color 0.3s ease' }}>About</a></li>
              <li style={{ margin: '0 20px' }}><a href="/events" style={{ fontSize: 15, padding: '10px 0', textDecoration: 'none', transition: 'color 0.3s ease' }}>Events</a></li>
              <li style={{ margin: '0 20px' }}><a href="/#team-section" style={{ fontSize: 15, padding: '10px 0', textDecoration: 'none', transition: 'color 0.3s ease' }}>Team</a></li>
              <li style={{ margin: '0 20px' }}><a href="/#contact" style={{ fontSize: 15, padding: '10px 0', textDecoration: 'none', transition: 'color 0.3s ease' }}>Contact</a></li>
            </ul>
            <button
              className="hamburger-menu block md:hidden"
              aria-label="Toggle menu"
              style={{
                width: 30,
                height: 24,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginLeft: 16,
                position: 'relative',
                zIndex: 1001
              }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span style={{
                display: 'block',
                height: 2,
                background: 'white',
                margin: '6px 0',
                transition: 'transform 0.3s ease',
                transform: mobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none'
              }}></span>
              <span style={{
                display: 'block',
                height: 2,
                background: 'white',
                margin: '6px 0',
                transition: 'opacity 0.3s ease',
                opacity: mobileMenuOpen ? 0 : 1
              }}></span>
              <span style={{
                display: 'block',
                height: 2,
                background: 'white',
                margin: '6px 0',
                transition: 'transform 0.3s ease',
                transform: mobileMenuOpen ? 'rotate(-45deg) translate(7px, -7px)' : 'none'
              }}></span>
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            background: 'rgba(0,0,0,0.95)',
            paddingTop: 80,
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ul className="mobile-menu-list" style={{ listStyle: 'none', textAlign: 'center', padding: 0, margin: 0 }}>
            <li><a href="/" style={{ fontSize: 24, padding: 15, display: 'block', textDecoration: 'none', transition: 'color 0.3s ease' }} onClick={() => setMobileMenuOpen(false)}>Home</a></li>
            <li><a href="/#about-us" style={{ fontSize: 24, padding: 15, display: 'block', textDecoration: 'none', transition: 'color 0.3s ease' }} onClick={() => setMobileMenuOpen(false)}>About</a></li>
            <li><a href="/events" style={{ fontSize: 24, padding: 15, display: 'block', textDecoration: 'none', transition: 'color 0.3s ease' }} onClick={() => setMobileMenuOpen(false)}>Events</a></li>
            <li><a href="/#team-section" style={{ fontSize: 24, padding: 15, display: 'block', textDecoration: 'none', transition: 'color 0.3s ease' }} onClick={() => setMobileMenuOpen(false)}>Team</a></li>
            <li><a href="/#contact" style={{ fontSize: 24, padding: 15, display: 'block', textDecoration: 'none', transition: 'color 0.3s ease' }} onClick={() => setMobileMenuOpen(false)}>Contact</a></li>
          </ul>
          <button
            aria-label="Close menu"
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: 32,
              cursor: 'pointer',
              zIndex: 1001
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
}