"use client";
import Link from "next/link";
import { UserRoleDisplay } from "@/components/UserRoleDisplay";
import { ProfileBootstrapper } from "@/components/ProfileBootstrapper";
import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-blue-100 via-white to-blue-200">
      <main>
        {/* Hero Section */}
        <section className="hero-section relative flex flex-row items-stretch justify-start px-4 min-h-[14.6vh] md:min-h-[17.3vh] bg-transparent" style={{ minHeight: '293px' }}>
          {/* Side Image as absolute vertical border with enhanced soft shadow, now extends further into navbar for stronger blending */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: '250px', minWidth: '120px', height: '100%', zIndex: 0 }}>
            <img
              src="/images/side_images/pooram_side_image_two_images_blur_1.png"
              alt="Kerala Sea Coast"
              className="h-full object-cover rounded-l-lg shadow-2xl"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '60% center', display: 'block', boxShadow: '0 0 96px 32px rgba(80,80,80,0.22)' }}
            />
          </div>
          {/* Logo absolutely positioned over the side image, with enhanced soft shadow */}
          <div className="absolute" style={{ left: '70px', top: '20px', zIndex: 10 }}>
            <img src="/images/side_images/malayalees_us_logo.avif" alt="MCEFEE Logo" style={{ width: 120, height: 120, minWidth: 80, minHeight: 80, background: 'rgba(255,255,255,0.7)', borderRadius: '50%', boxShadow: '0 8px 64px 16px rgba(80,80,80,0.22)' }} />
          </div>
          {/* Content with left padding for image */}
          <div className="flex flex-row items-start flex-1 h-full pl-[260px] gap-8 relative z-10">
            {/* Hero Text */}
            <div className="flex flex-col justify-center flex-1 text-left pl-8">
              <h1 className="hero-title text-2xl md:text-4xl font-bold mb-2 text-gray-900">
                Welcome to MCEFEE
              </h1>
              <span className="block text-yellow-400 text-xl md:text-3xl font-bold mb-2">Malayalee Cultural &amp; Educational Foundation of East Europe</span>
              <p className="text-base md:text-xl text-gray-700 mb-4 max-w-2xl">
                Building a vibrant Malayalee community in Eastern Europe through culture, education, and togetherness.
              </p>
              <a href="#about" className="inline-block bg-yellow-400 text-gray-900 px-8 py-3 rounded-lg font-semibold text-lg shadow hover:bg-yellow-300 transition">Learn More</a>
            </div>
          </div>
        </section>

        {/* Feature Boxes Section */}
        <section className="feature-boxes flex flex-col md:flex-row w-full">
          <div className="feature-box flex-1 w-full min-h-[180px] mb-4 md:mb-0" style={{ backgroundImage: "url('/images/unite_india_logo.avif')", backgroundSize: '45%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundColor: '#1a1a1a', padding: '40px' }}>
            {/* <div>
                    <h4>Story behind the foundation</h4>
                    <a href="#vision-section" className="link-text">Mission and Vision</a>
                  </div> */}
          </div>
          <div className="feature-box flex-1 w-full min-h-[180px]" style={{ backgroundImage: "url('/images/lady_dance.jpeg')", backgroundSize: '55%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', padding: '40px' }}>
            <div>
              <h4>cultural events, educational programs, and community gatherings</h4>
              <a href="/events" className="link-text">Upcoming events</a>
            </div>
          </div>
        </section>

        {/* Events Section (example) */}
        <section id="events" className="events-section py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="section-title-wrapper mb-10">
              <h3 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Upcoming Events</h3>
              <div className="section-subtitle text-lg text-yellow-500 font-semibold mb-2">Join Our Celebrations</div>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="event-item bg-gray-50 rounded-lg shadow p-6 flex flex-col items-center">
                <div className="event-image w-full h-48 rounded-lg overflow-hidden mb-4">
                  <img src="/images/event1.jpg" alt="Event 1" className="w-full h-full object-cover" />
                </div>
                <div className="event-content text-center">
                  <h4 className="event-title text-xl font-semibold mb-2">Onam 2024</h4>
                  <p className="text-gray-600 mb-2">Celebrate Kerala's harvest festival with us! Traditional games, music, and a grand feast await.</p>
                  <span className="text-yellow-600 font-bold">August 25, 2024</span>
                </div>
              </div>
              <div className="event-item bg-gray-50 rounded-lg shadow p-6 flex flex-col items-center">
                <div className="event-image w-full h-48 rounded-lg overflow-hidden mb-4">
                  <img src="/images/event2.jpg" alt="Event 2" className="w-full h-full object-cover" />
                </div>
                <div className="event-content text-center">
                  <h4 className="event-title text-xl font-semibold mb-2">Malayalam Movie Night</h4>
                  <p className="text-gray-600 mb-2">Enjoy a screening of a classic Malayalam film with friends and family. Popcorn included!</p>
                  <span className="text-yellow-600 font-bold">September 10, 2024</span>
                </div>
              </div>
              <div className="event-item bg-gray-50 rounded-lg shadow p-6 flex flex-col items-center">
                <div className="event-image w-full h-48 rounded-lg overflow-hidden mb-4">
                  <img src="/images/event3.jpg" alt="Event 3" className="w-full h-full object-cover" />
                </div>
                <div className="event-content text-center">
                  <h4 className="event-title text-xl font-semibold mb-2">Youth Talent Show</h4>
                  <p className="text-gray-600 mb-2">Showcase your skills in music, dance, and more. Open to all ages!</p>
                  <span className="text-yellow-600 font-bold">October 5, 2024</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="about-us-section py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="section-title-wrapper mb-10">
              <h3 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">About Us</h3>
              <div className="section-subtitle text-lg text-yellow-500 font-semibold mb-2">Who We Are</div>
            </div>
            <div className="about-us-content bg-white rounded-lg shadow p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center">
              <img src="/images/about_us_malyalee_us.jpg" alt="About Us" className="rounded-lg w-full md:w-1/2 max-w-md shadow-lg" />
              <div className="about-us-text text-lg text-gray-700 md:w-1/2">
                <p>
                  Formed in 1979 with the purpose of bringing together Indians of Kerala origin living in New Jersey to maintain the rich heritage and to provide their children an opportunity to get a glimpse of our culture.

                  Registered in the Newark hall of records as a non-profit organization.  The inaugural meeting of the association was conducted in the Grace Church Hall in Orange NJ on May 12th 1979.

                  Kerala Association of New Jersey (KANJ), is one of the largest and oldest Indian Associations in America.  KANJ continues to grow in its 46th year, while spreading the culture of the beautiful state of Kerala through popular events and activities.

                  KANJ stands for the integrity and unity of New Jersey Keralites. It seeks to promote the culture of Kerala, the southernmost state of India. It preserves Kerala traditions in American soil for future generations to discover, share, and follow.
                </p>
                <ul className="list-disc pl-6 mt-4 text-base text-gray-600">
                  <li>Organizing cultural festivals and events</li>
                  <li>Supporting students and professionals</li>
                  <li>Promoting Malayalam language and arts</li>
                  <li>Community outreach and social support</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* What We Do Section */}
        <section className="what-we-do py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="section-title-wrapper mb-10">
              <span className="section-subtitle text-yellow-500 font-semibold mb-2 block">What we do</span>
              <h3 className="text-3xl md:text-4xl font-bold mb-6 ml-0 md:ml-12">Cultural Workshops and Educational Events</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Traditional Dance & Music */}
              <div className="service-item flex gap-6 items-start">
                <div className="service-icon w-16 h-16 flex items-center justify-center bg-yellow-100 rounded-full">
                  {/* Music Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8 text-green-500"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm-2 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" /></svg>
                </div>
                <div className="service-content">
                  <h4 className="text-xl font-semibold mb-2">Traditional Dance & Music</h4>
                  <p>Experience the rich heritage of Kerala through dance and music workshops.</p>
                </div>
              </div>
              {/* Art & Craft */}
              <div className="service-item flex gap-6 items-start">
                <div className="service-icon w-16 h-16 flex items-center justify-center bg-yellow-100 rounded-full">
                  {/* Art Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8 text-orange-500"><path fill="currentColor" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>
                </div>
                <div className="service-content">
                  <h4 className="text-xl font-semibold mb-2">Art & Craft Workshops</h4>
                  <p>Learn traditional Kerala art forms and crafts through hands-on workshops.</p>
                </div>
              </div>
              {/* Kerala Folklore and Tribal Traditions */}
              <div className="service-item flex gap-6 items-start">
                <div className="service-icon w-16 h-16 flex items-center justify-center bg-yellow-100 rounded-full">
                  {/* Book Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8 text-blue-500"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
                </div>
                <div className="service-content">
                  <h4 className="text-xl font-semibold mb-2">Kerala Folklore and Tribal Traditions</h4>
                  <p>Introduce lesser-known folk dances like Theyyam, Padayani, and Poothan Thira.</p>
                </div>
              </div>
              {/* Kerala Cuisine */}
              <div className="service-item flex gap-6 items-start">
                <div className="service-icon w-16 h-16 flex items-center justify-center bg-yellow-100 rounded-full">
                  {/* Cuisine Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8 text-yellow-500"><path fill="currentColor" d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" /></svg>
                </div>
                <div className="service-content">
                  <h4 className="text-xl font-semibold mb-2">Kerala Cuisine Classes</h4>
                  <p>Master the art of traditional Kerala cooking with expert chefs.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ticker/Banner Section */}
        <section className="ticker-section bg-yellow-400 text-white py-2 overflow-hidden">
          <div className="ticker flex animate-marquee whitespace-nowrap">
            <div className="ticker-item px-8">Culture is the thread to thrive and ties generations to their roots !</div>
            <div className="ticker-item px-8">Culture is the thread to thrive and ties generations to their roots !</div>
            <div className="ticker-item px-8">Culture is the thread to thrive and ties generations to their roots !</div>
          </div>
        </section>

        {/* Team Section */}
        <section className="team-section py-20 bg-white" id="team-section">
          <div className="container mx-auto px-4">
            <div className="section-title-wrapper mb-10">
              <span className="section-subtitle text-yellow-500 font-semibold mb-2 block">Team</span>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">Meet our best volunteers team</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 justify-center">
              {/* Team members - use images from public/images/team_members/ */}
              <div className="team-item flex flex-col items-center">
                <div className="team-image w-32 h-32 rounded-full overflow-hidden mb-4 bg-gray-200 mx-auto">
                  <img src="/images/team_members/Manoj_Kizhakkoot.png" alt="Manoj_Kizhakkoot" className="object-cover w-full h-full" style={{ objectPosition: 'center 20%' }} onError={e => e.currentTarget.src = '/images/about-us.jpg'} />
                </div>
                <div className="team-content text-center">
                  <h5 className="team-title text-lg font-semibold">Manoj Kizhakkoot</h5>
                  <div className="team-position text-gray-500">Founder: NJ Malayalees, Unite India</div>
                </div>
              </div>
              <div className="team-item flex flex-col items-center">
                <div className="team-image w-32 h-32 rounded-full overflow-hidden mb-4 bg-gray-200 mx-auto">
                  <img src="/images/team_members/srk.png" alt="SRK" className="object-cover w-full h-full" onError={e => e.currentTarget.src = '/images/about-us.jpg'} />
                </div>
                <div className="team-content text-center">
                  <h5 className="team-title text-lg font-semibold">SRK</h5>
                  <div className="team-position text-gray-500">Unite India - Financial Controller</div>
                </div>
              </div>
              {/* <div className="team-item flex flex-col items-center">
                <div className="team-image w-32 h-32 rounded-full overflow-hidden mb-4 bg-gray-200">
                  <img src="/images/team_members/arun_sadasivan.jpeg" alt="Arun Sadasivan" className="object-cover w-full h-full" onError={e => e.currentTarget.src = '/images/about-us.jpg'} />
                </div>
                <div className="team-content text-center">
                  <h5 className="team-title text-lg font-semibold">Arun Sadasivan</h5>
                  <div className="team-position text-gray-500">Volunteer</div>
                </div>
              </div>
              <div className="team-item flex flex-col items-center">
                <div className="team-image w-32 h-32 rounded-full overflow-hidden mb-4 bg-gray-200">
                  <img src="/images/team_members/latha_krishnan.jpeg" alt="Latha Krishnan" className="object-cover w-full h-full" onError={e => e.currentTarget.src = '/images/about-us.jpg'} />
                </div>
                <div className="team-content text-center">
                  <h5 className="team-title text-lg font-semibold">Latha Krishnan</h5>
                  <div className="team-position text-gray-500">Volunteer</div>
                </div>
              </div>
              <div className="team-item flex flex-col items-center">
                <div className="team-image w-32 h-32 rounded-full overflow-hidden mb-4 bg-gray-200">
                  <img src="/images/team_members/varun_lal.jpeg" alt="Varun Lal" className="object-cover w-full h-full" onError={e => e.currentTarget.src = '/images/about-us.jpg'} />
                </div>
                <div className="team-content text-center">
                  <h5 className="team-title text-lg font-semibold">Varun Lal</h5>
                  <div className="team-position text-gray-500">Volunteer</div>
                </div>
              </div> */}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="contact-section py-20 bg-gray-50" id="contact">
          <div className="container mx-auto px-4">
            <div className="section-title-wrapper mb-10">
              <span className="section-subtitle text-yellow-500 font-semibold mb-2 block">Contact</span>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">Get in touch</h3>
            </div>
            <p className="contact-description text-center max-w-2xl mx-auto mb-10 text-gray-600">Connect with us to learn more about our community initiatives and how you can get involved in preserving and promoting Malayali culture across the United States. Join us in fostering cultural exchange and building stronger connections within our diverse communities.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              <div className="contact-item">
                <h6 className="text-lg font-semibold mb-2">Location</h6>
                <p>MCEFEE<br />Malayali Cultural Exchange Foundation<br />for Education and Events<br />New Jersey, USA</p>
              </div>
              <div className="contact-item">
                <h6 className="text-lg font-semibold mb-2">Phone</h6>
                <p><a href="tel:+19085168781" className="text-blue-600 hover:underline">(908) 516-8781</a></p>
              </div>
              <div className="contact-item">
                <h6 className="text-lg font-semibold mb-2">Social</h6>
                <div className="flex gap-3">
                  <a href="https://www.facebook.com/profile.php?id=61573944338286" className="social-icon bg-gray-800 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-yellow-400" target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-facebook-f"></i>
                  </a>
                </div>
              </div>
              <div className="contact-item">
                <h6 className="text-lg font-semibold mb-2">Email</h6>
                <p><a href="mailto:Contactus@mcefee.org" className="text-blue-600 hover:underline">Contactus@mcefee.org</a></p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Section */}
        <footer className="bg-gray-900 text-gray-200 pt-10">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-8 border-b border-gray-700">
              <div className="footer-widget flex flex-col items-center md:items-start">
                <div className="footer-logo mb-4">
                  <img src="/images/mcefee_logo_black_border_transparent.png" alt="Footer Logo" className="w-32 h-auto" onError={e => e.currentTarget.src = '/images/about-us.jpg'} />
                </div>
                <h6 className="footer-widget-title text-lg font-semibold mb-2">Follow us</h6>
                <ul className="footer-socials flex gap-3">
                  <li><a href="https://www.facebook.com/profile.php?id=61573944338286" target="_blank" rel="noopener noreferrer" className="bg-gray-800 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-yellow-400"><i className="fab fa-facebook-f"></i></a></li>
                </ul>
              </div>
              <div className="footer-widget">
                <h6 className="footer-widget-title text-lg font-semibold mb-2">Main menu</h6>
                <ul className="footer-menu space-y-2">
                  <li><a href="#" className="hover:text-yellow-400">Home</a></li>
                  <li><a href="#about-us" className="hover:text-yellow-400">About</a></li>
                  <li><a href="#events" className="hover:text-yellow-400">Events</a></li>
                  <li><a href="#team-section" className="hover:text-yellow-400">Team</a></li>
                  <li><a href="#contact" className="hover:text-yellow-400">Contact</a></li>
                </ul>
              </div>
              <div className="footer-widget">
                <h6 className="footer-widget-title text-lg font-semibold mb-2">Contacts</h6>
                <div className="footer-contact text-sm">
                  <p>MCEFEE<br />Malayali Cultural Exchange Foundation<br />for Education and Events<br />New Jersey, USA</p>
                  <p><a href="tel:+19085168781" className="text-blue-400 hover:underline">(908) 516-8781</a></p>
                  <p><a href="mailto:Contactus@mcefee.org" className="text-blue-400 hover:underline">Contactus@mcefee.org</a></p>
                </div>
              </div>
            </div>
            <div className="footer-wrapper py-6 flex flex-col items-center">
              <div className="copyright text-yellow-400 text-center text-sm">
                © {new Date().getFullYear()} MCEFEE<br />Malayali Cultural Exchange Foundation<br />for Education and Events
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div >
  );
}