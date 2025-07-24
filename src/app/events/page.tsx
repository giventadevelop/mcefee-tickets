import Link from "next/link";
import { PhilantropHeaderClient } from '@/components/PhilantropHeaderClient';
import { Footer } from '@/components/Footer';



export default async function EventsPage() {

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <PhilantropHeaderClient />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-black md:h-1/3 h-screen pt-32 md:pt-12" style={{
        marginTop: 0
      }}>
        <div className="absolute top-20 md:top-20 right-0 w-full md:w-1/3 h-1/2 md:h-3/4 bg-cover bg-center opacity-60 md:opacity-70" style={{
          backgroundImage: "url('/images/kathakali_with_back_light_hero_ai.png')"
        }}></div>
        <div className="absolute -top-5 left-0 right-0 bottom-0 z-10 pt-5" style={{
          background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.3) 100%)'
        }}></div>
        <div className="relative z-30 px-5 max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-start h-full text-left gap-4 md:gap-8 pt-24 md:pt-0">
          <img
            src="/images/mcefee_logo_black_border_transparent.png"
            className="w-32 md:w-44 h-auto ml-0 opacity-60 transition-opacity duration-300"
            alt="MCEFEE Logo"
            style={{
              filter: 'brightness(1.1) contrast(0.9)',
              mixBlendMode: 'screen'
            }}
          />
          <h1 className="text-xl md:text-2xl leading-relaxed m-0 text-white text-left max-w-2xl flex-grow" style={{
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}>
            Discover Our <span style={{ color: '#ffce59' }}>Cultural Events</span> and Celebrations
          </h1>
        </div>
      </section>

      <div className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Events Section */}
        <section className="pt-8 pb-16 w-full">
          <div className="max-w-6xl mx-auto px-4">
            <div className="mb-8">
              <span className="text-sm text-yellow-400 mb-1 inline-block uppercase relative pl-12" style={{
                color: '#ffce59'
              }}>
                <span className="absolute left-0 top-1/2 w-10 h-px" style={{
                  backgroundColor: '#ffce59'
                }}></span>
                Events
              </span>
              <h3 className="text-3xl leading-tight mb-6">Upcoming Events & Celebrations</h3>
            </div>

            {/* Main Event Highlight */}
            <div className="bg-yellow-300 rounded-lg p-8 mb-8 relative overflow-hidden" style={{
              backgroundColor: '#ffce59'
            }}>
              <span className="block text-base font-medium mb-3 text-gray-800 opacity-90">Featured Event</span>
              <h4 className="text-2xl font-semibold mb-4 text-gray-800">SPARK OF KERALA 2025</h4>
              <p className="text-base leading-relaxed mb-0 text-gray-800 opacity-90">
                We are excited to announce SPARK OF KERALA – a grand celebration of Kerala's most iconic festival, Onam,
                set to take place in the USA in 2025. This event promises to be an unforgettable experience, capturing the
                true essence of Onam through a power-packed performance that showcases the vibrant culture, traditions, and
                spirit of Kerala.
              </p>
            </div>

            {/* Event Cards */}
            <div>
              <h4 className="text-2xl mb-5 text-gray-800">More Events</h4>
              <div className="space-y-6">
                {/* Static Event Cards */}
                <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-md overflow-hidden w-full" style={{ minHeight: '350px' }}>
                  <div className="w-full md:w-48 h-[350px] md:h-[278px] flex-shrink-0 overflow-hidden rounded-t-lg md:rounded-t-none">
                    <img
                      src="/images/spark_kerala_event_2025.jpeg"
                      alt="SPARK OF KERALA"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  <div className="flex-grow p-6 min-w-0">
                    <h5 className="m-0 mb-3 text-2xl md:text-xl whitespace-normal overflow-hidden text-ellipsis">
                      SPARK OF KERALA
                    </h5>
                    <p className="text-lg md:text-base text-gray-600 whitespace-normal mb-4 md:mb-0">
                      Celebrates the vibrant culture, art, and heritage of Kerala across the USA
                    </p>
                  </div>
                  <div className="w-full md:w-32 min-w-32 flex-shrink-0 flex flex-row md:flex-col justify-center items-center bg-gray-50 p-6 border-t md:border-t-0">
                    <div className="text-center">
                      <div className="text-xl md:text-lg font-bold text-yellow-500">
                        AUG-SEP
                      </div>
                      <div className="text-base md:text-sm text-gray-600">
                        2025
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-md overflow-hidden w-full" style={{ minHeight: '350px' }}>
                  <div className="w-full md:w-48 h-[350px] md:h-[278px] flex-shrink-0 overflow-hidden rounded-t-lg md:rounded-t-none">
                    <img
                      src="/images/Karnatic_Music_Festival.jpeg"
                      alt="Karnatic Music Festival"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  <div className="flex-grow p-6 min-w-0">
                    <h5 className="m-0 mb-3 text-2xl md:text-xl whitespace-normal overflow-hidden text-ellipsis">
                      Karnatic Music Festival
                    </h5>
                    <p className="text-lg md:text-base text-gray-600 whitespace-normal mb-4 md:mb-0">
                      A Tribute to Kerala's Classical Melodies Across the USA
                    </p>
                  </div>
                  <div className="w-full md:w-32 min-w-32 flex-shrink-0 flex flex-row md:flex-col justify-center items-center bg-gray-50 p-6 border-t md:border-t-0">
                    <div className="text-center">
                      <div className="text-xl md:text-lg font-bold text-yellow-500">
                        OCT-NOV
                      </div>
                      <div className="text-base md:text-sm text-gray-600">
                        2025
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {/* FOOTER - bleeds to edges */}
      <Footer />
    </div>
  );
}