import React from 'react';
import { Layout } from '@/components/layout';

export default function Privacy() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 border border-slate-200">
        <h1 className="text-3xl font-display font-bold text-slate-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Information We Collect</h2>
            <p className="text-slate-700 leading-relaxed">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Account information (email, display name) when you sign up</li>
              <li>Profile information (birthday, income bracket) if you choose to provide it</li>
              <li>Challenge responses and rankings</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. How We Use Your Information</h2>
            <p className="text-slate-700 leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Provide and improve our services</li>
              <li>Calculate your scores and rankings</li>
              <li>Personalize your experience</li>
              <li>Send you updates and notifications (if you opt in)</li>
              <li>Analyze usage patterns to improve the app</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Cookies and Tracking</h2>
            <p className="text-slate-700 leading-relaxed">
              We use cookies and similar technologies to maintain your session, remember your preferences, 
              and analyze how you use our service. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Third-Party Services</h2>
            <p className="text-slate-700 leading-relaxed">
              We may use third-party services such as Google Analytics and Google AdSense. 
              These services have their own privacy policies governing the collection and use of your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Data Security</h2>
            <p className="text-slate-700 leading-relaxed">
              We implement appropriate security measures to protect your personal information. 
              However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Your Rights</h2>
            <p className="text-slate-700 leading-relaxed">
              You have the right to access, update, or delete your personal information at any time 
              through your profile settings or by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Children's Privacy</h2>
            <p className="text-slate-700 leading-relaxed">
              Our service is not intended for children under 13. We do not knowingly collect 
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Changes to This Policy</h2>
            <p className="text-slate-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Contact Us</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="/contact" className="text-emerald-600 hover:underline">our contact page</a>.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}


