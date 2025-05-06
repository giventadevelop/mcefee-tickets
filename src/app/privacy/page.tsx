import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-4">Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Information We Collect</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>Personal identification information (name, email address, etc.)</li>
        <li>Usage data and cookies</li>
        <li>Third-party authentication data (if you use social login)</li>
      </ul>
      <h2 className="text-xl font-semibold mt-6 mb-2">How We Use Your Information</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>To provide and maintain our service</li>
        <li>To notify you about changes to our service</li>
        <li>To allow you to participate in interactive features</li>
        <li>To provide customer support</li>
        <li>To monitor usage and improve our service</li>
      </ul>
      <h2 className="text-xl font-semibold mt-6 mb-2">Your Rights</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>You can access, update, or delete your personal information at any time</li>
        <li>You can opt out of marketing communications</li>
        <li>You can request a copy of your data</li>
      </ul>
      <h2 className="text-xl font-semibold mt-6 mb-2">Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@example.com" className="text-blue-600 underline">support@example.com</a>.</p>
    </div>
  );
}