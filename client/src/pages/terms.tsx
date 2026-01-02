import React from 'react';
import { Layout } from '@/components/layout';

export default function Terms() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 border border-slate-200">
        <h1 className="text-3xl font-display font-bold text-slate-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              By accessing and using MoneyRank, you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Use License</h2>
            <p className="text-slate-700 leading-relaxed">
              Permission is granted to temporarily use MoneyRank for personal, non-commercial purposes only. 
              This license does not include:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for commercial purposes</li>
              <li>Attempting to reverse engineer any software</li>
              <li>Removing any copyright or proprietary notations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Disclaimer</h2>
            <p className="text-slate-700 leading-relaxed">
              <strong>MoneyRank is not financial advice.</strong> The information and challenges provided 
              are for educational and entertainment purposes only. We do not provide personalized financial 
              advice, and you should consult with a qualified financial advisor before making any financial decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Limitations</h2>
            <p className="text-slate-700 leading-relaxed">
              In no event shall MoneyRank or its suppliers be liable for any damages (including, without limitation, 
              damages for loss of data or profit, or due to business interruption) arising out of the use or 
              inability to use the materials on MoneyRank.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Accuracy of Materials</h2>
            <p className="text-slate-700 leading-relaxed">
              The materials appearing on MoneyRank could include technical, typographical, or photographic errors. 
              We do not warrant that any of the materials are accurate, complete, or current.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. User Accounts</h2>
            <p className="text-slate-700 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and password. 
              You agree to accept responsibility for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Prohibited Uses</h2>
            <p className="text-slate-700 leading-relaxed">You may not use our service:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>In any way that violates any applicable law or regulation</li>
              <li>To transmit any malicious code or viruses</li>
              <li>To attempt to gain unauthorized access to our systems</li>
              <li>To interfere with or disrupt the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Modifications</h2>
            <p className="text-slate-700 leading-relaxed">
              We may revise these terms of service at any time without notice. By using this service, 
              you are agreeing to be bound by the then current version of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Contact Information</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="/contact" className="text-emerald-600 hover:underline">our contact page</a>.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}

