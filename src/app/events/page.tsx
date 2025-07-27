import Link from "next/link";
import { PhilantropHeaderClient } from '@/components/PhilantropHeaderClient';
import { Footer } from '@/components/Footer';

export default async function EventsPage() {
  return (
    <>
      <PhilantropHeaderClient />
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (min-width: 768px) {
            .mobile-layout { display: none !important; }
            .desktop-layout { display: flex !important; }
          }
          @media (max-width: 767px) {
            .mobile-layout { display: flex !important; }
            .desktop-layout { display: none !important; }
          }

          /* Override global event-item styles for desktop */
          @media (min-width: 768px) {
            .event-item {
              display: flex !important;
              flex-direction: row !important;
              align-items: stretch !important;
              padding: 0 !important;
            }

            .event-title {
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }

            .event-address {
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }
          }
        `
      }} />

      {/* Hero Section with enhanced styling */}
      <section className="hero-section events-hero-section" style={{
        height: 'calc(30vh + 62px)',
        minHeight: '300px',
        position: 'relative',
        overflow: 'visible',
        backgroundColor: '#000',
        marginBottom: 0,
        paddingBottom: 0,
        paddingTop: '0px',
        marginTop: 0
      }}>
        {/* Mobile Background - Top Position */}
        <div className="block md:hidden mobile-background" style={{
          width: '100%',
          height: '180px',
          backgroundImage: "url('/images/kathakali_with_back_light_hero_ai.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.7,
          filter: 'blur(0.5px)',
          marginBottom: '5px'
        }}></div>

        {/* Desktop Layout */}
        <div className="desktop-layout hero-content" style={{
          position: 'relative',
          zIndex: 3,
          padding: '0 20px',
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: '100%',
          minHeight: 180,
          gap: '40px',
          paddingTop: '60px',
          paddingBottom: '40px'
        }}>
          <img src="/images/mcefee_logo_black_border_transparent.png" className="hero-mcafee-logo" alt="MCEFEE Logo" style={{ width: 220, height: 'auto', opacity: 0.6, marginLeft: -350 }} />
          <h1 className="hero-title" style={{
            fontSize: 26,
            lineHeight: 1.6,
            color: 'white',
            maxWidth: 450,
            fontFamily: 'Sora, sans-serif',
            marginLeft: -36,
            marginRight: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span>Discover Our Cultural Events</span>
            <span style={{ color: '#ffce59', fontSize: 26 }}>and Celebrations</span>
          </h1>
        </div>

        {/* Mobile Layout */}
        <div className="mobile-layout" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2px',
          gap: '8px',
          minHeight: '120px'
        }}>
          <img src="/images/mcefee_logo_black_border_transparent.png" alt="MCEFEE Logo" style={{
            width: '160px',
            height: 'auto',
            opacity: 0.9,
            display: 'block',
            margin: '0 auto'
          }} />
          <h1 style={{
            fontSize: '18px',
            lineHeight: 1.3,
            color: 'white',
            maxWidth: '90%',
            fontFamily: 'Sora, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            textAlign: 'center',
            margin: '0 auto'
          }}>
            <span>Discover Our Cultural Events</span>
            <span style={{ color: '#ffce59', fontSize: '18px' }}>and Celebrations</span>
          </h1>
        </div>

        {/* Desktop Background */}
        <div className="hidden md:block hero-background" style={{
          position: 'absolute',
          top: '25%',
          right: '10px',
          left: 'auto',
          width: '30%',
          height: '75%',
          backgroundImage: "url('/images/kathakali_with_back_light_hero_ai.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.8,
          filter: 'blur(0.5px)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.9) 50%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.3) 85%, rgba(0,0,0,0) 100%)',
          maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.9) 50%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.3) 85%, rgba(0,0,0,0) 100%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}>
          {/* Top gradient overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '25%',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.1) 100%)',
            zIndex: 1,
            filter: 'blur(1px)'
          }}></div>

          {/* Bottom gradient overlay */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '25%',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.1) 100%)',
            zIndex: 1,
            filter: 'blur(1px)'
          }}></div>

          {/* Left gradient overlay - enhanced for better fade */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '20%',
            height: '100%',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 20%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0) 100%)',
            zIndex: 1,
            filter: 'blur(1px)'
          }}></div>

          {/* Additional left fade gradient for smoother transition */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '35%',
            height: '100%',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.05) 80%, rgba(0,0,0,0) 100%)',
            zIndex: 1,
            filter: 'blur(1.5px)'
          }}></div>

          {/* Right gradient overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '25%',
            height: '100%',
            background: 'linear-gradient(270deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.1) 100%)',
            zIndex: 1,
            filter: 'blur(1px)'
          }}></div>

          {/* Corner gradient overlays for smoother blending */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '30%',
            height: '30%',
            background: 'radial-gradient(ellipse at top left, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0) 100%)',
            zIndex: 2
          }}></div>

          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '30%',
            height: '30%',
            background: 'radial-gradient(ellipse at top right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
            zIndex: 2
          }}></div>

          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '30%',
            height: '30%',
            background: 'radial-gradient(ellipse at bottom left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
            zIndex: 2
          }}></div>

          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '30%',
            height: '30%',
            background: 'radial-gradient(ellipse at bottom right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
            zIndex: 2
          }}></div>
        </div>
        <div className="hero-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.3) 100%)',
          zIndex: 1
        }}></div>
      </section>

      {/* Events Section */}
      <section className="events-section" style={{
        paddingTop: '30px',
        paddingBottom: '60px'
      }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="section-title-wrapper" style={{ marginBottom: '30px' }}>
            <span className="section-subtitle" style={{
              fontSize: '14px',
              color: '#ffce59',
              marginBottom: '5px',
              display: 'inline-block',
              textTransform: 'uppercase',
              position: 'relative',
              paddingLeft: '50px'
            }}>
              <span style={{
                content: '',
                position: 'absolute',
                left: 0,
                top: '50%',
                width: '40px',
                height: '1px',
                backgroundColor: '#ffce59'
              }}></span>
              Events
            </span>
            <h3 style={{
              fontSize: '28px',
              lineHeight: 1.2,
              marginBottom: '25px'
            }}>
              Upcoming Events & Celebrations
            </h3>
          </div>

          {/* Main Event Highlight */}
          <div className="main-event" style={{
            backgroundColor: '#ffce59',
            borderRadius: '10px',
            padding: '30px',
            color: '#333',
            marginBottom: '30px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <span style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 500,
              marginBottom: '10px',
              color: '#333',
              opacity: 0.9
            }}>
              Featured Event
            </span>
            <h4 style={{
              fontSize: '24px',
              fontWeight: 600,
              marginBottom: '15px',
              color: '#333'
            }}>
              SPARK OF KERALA 2025
            </h4>
            <p style={{
              fontSize: '16px',
              lineHeight: 1.6,
              marginBottom: 0,
              color: '#333',
              opacity: 0.9
            }}>
              We are excited to announce SPARK OF KERALA – a grand celebration of Kerala's most iconic festival, Onam,
              set to take place in the USA in 2025. This event promises to be an unforgettable experience, capturing the
              true essence of Onam through a power-packed performance that showcases the vibrant culture, traditions, and
              spirit of Kerala.
            </p>
          </div>

          {/* Event Items */}
          <div>
            <h4 style={{ fontSize: '22px', marginBottom: '20px', color: '#333' }}>More Events</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Event Item 1 */}
              <div className="event-item" style={{
                display: 'flex',
                marginBottom: '20px',
                background: 'white',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 5px 20px rgba(0,0,0,0.05)'
              }}>
                <div className="event-image" style={{
                  width: '210px',
                  minWidth: '210px',
                  height: '210px',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  <img
                    src="/images/spark_kerala_event_2025.png"
                    alt="SPARK OF KERALA"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                  />
                </div>
                <div className="event-content" style={{
                  flexGrow: 1,
                  padding: '25px',
                  minWidth: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  <h5 className="event-title" style={{
                    margin: '0 0 10px',
                    fontSize: '22px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: '600',
                    width: '100%'
                  }}>
                    SPARK OF KERALA
                  </h5>
                  <p className="event-address" style={{
                    fontSize: '18px',
                    color: '#333',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: 0,
                    width: '100%'
                  }}>
                    Celebrates the vibrant culture, art, and heritage of Kerala across the USA
                  </p>
                </div>
                <div className="event-date" style={{
                  width: '140px',
                  minWidth: '140px',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: '#f9f9f9',
                  padding: '25px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#ffce59'
                    }}>
                      AUG-SEP
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      2025
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Item 2 */}
              <div className="event-item" style={{
                display: 'flex',
                marginBottom: '20px',
                background: 'white',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 5px 20px rgba(0,0,0,0.05)'
              }}>
                <div className="event-image" style={{
                  width: '210px',
                  minWidth: '210px',
                  height: '210px',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  <img
                    src="/images/Karnatic_Music_Festival.jpeg"
                    alt="Karnatic Music Festival"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                  />
                </div>
                <div className="event-content" style={{
                  flexGrow: 1,
                  padding: '25px',
                  minWidth: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  <h5 className="event-title" style={{
                    margin: '0 0 10px',
                    fontSize: '22px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: '600',
                    width: '100%'
                  }}>
                    Karnatic Music Festival
                  </h5>
                  <p className="event-address" style={{
                    fontSize: '18px',
                    color: '#333',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: 0,
                    width: '100%'
                  }}>
                    A Tribute to Kerala's Classical Melodies Across the USA
                  </p>
                </div>
                <div className="event-date" style={{
                  width: '140px',
                  minWidth: '140px',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: '#f9f9f9',
                  padding: '25px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#ffce59'
                    }}>
                      OCT-NOV
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      2025
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <style dangerouslySetInnerHTML={{
        __html: `
                    @media (max-width: 767px) {
            html, body {
              margin-top: 0 !important;
              padding-top: 0 !important;
            }

            .hero-section {
              height: 60vh !important;
              padding-top: 10px !important;
              margin-top: 0 !important;
              position: relative !important;
              top: 0 !important;
            }

            .mobile-layout {
              padding-top: 0 !important;
              margin-top: 0 !important;
            }

            .mobile-background {
              margin-bottom: 5px !important;
            }

            /* Force remove any top spacing */
            * {
              margin-top: 0 !important;
            }

            .hero-background {
              width: 100% !important;
              height: 36% !important;
              top: 100px !important;
              left: 0% !important;
              right: auto !important;
              opacity: 0.7 !important;
              -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0) 100%) !important;
              mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0) 100%) !important;
            }

            .hero-content {
              padding-top: 40px !important;
              margin-top: 5px !important;
              padding-left: 20px !important;
              padding-right: 20px !important;
              gap: 30px !important;
            }

            .hero-mcafee-logo {
              margin-left: -300px !important;
            }

            .hero-title {
              font-size: 20px !important;
              text-align: left !important;
              padding: 0 !important;
              margin-left: -300px !important;
              max-width: 400px !important;
              margin-top: 25px !important;
            }

            .hero-title span {
              font-size: 18px !important;
            }

            .events-section {
              padding-top: 20px !important;
              padding-bottom: 40px !important;
            }

            .section-title-wrapper {
              margin-bottom: 25px !important;
            }

            .event-item {
              flex-direction: column !important;
              width: 100% !important;
              margin: 0 !important;
              border-radius: 10px !important;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
            }

            .event-image {
              width: 100% !important;
              height: 350px !important;
              border-radius: 10px 10px 0 0 !important;
            }

            .event-content {
              width: 100% !important;
              padding: 30px !important;
              text-align: left !important;
              min-width: auto !important;
            }

            .event-title {
              font-size: 26px !important;
              margin-bottom: 15px !important;
              color: #333 !important;
              white-space: normal !important;
            }

            .event-address {
              font-size: 19px !important;
              color: #666 !important;
              margin-bottom: 20px !important;
              white-space: normal !important;
            }

            .event-date {
              width: 100% !important;
              padding: 15px 20px !important;
              border-top: 1px solid rgba(0,0,0,0.1) !important;
              display: flex !important;
              flex-direction: row !important;
              justify-content: flex-start !important;
              align-items: center !important;
              background: transparent !important;
            }

            .event-time {
              font-size: 20px !important;
              margin-right: 15px !important;
              color: #ffce59 !important;
            }

            .main-event {
              padding: 20px !important;
            }

            .main-event span {
              font-size: 14px !important;
            }

            .main-event h4 {
              font-size: 20px !important;
            }

            .main-event p {
              font-size: 14px !important;
            }
          }
        `
      }} />
    </>
  );
}
