import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send } from 'lucide-react';

export default function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd send this to your backend
    // For now, we'll use mailto link
    const mailtoLink = `mailto:moneyrank.help@gmail.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`From: ${formData.name} (${formData.email})\n\n${formData.message}`)}`;
    window.location.href = mailtoLink;
    toast({
      title: 'Email client opened',
      description: 'Please send the email from your email client.',
    });
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 border border-slate-200">
        <div className="text-center mb-8">
          <Mail className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">Contact Us</h1>
          <p className="text-slate-600">
            Have a question or feedback? We'd love to hear from you!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              rows={6}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
            />
          </div>

          <Button type="submit" className="w-full">
            <Send className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3">Or reach us directly:</h3>
          <p className="text-slate-700">
            Email: <a href="mailto:moneyrank.help@gmail.com" className="text-emerald-600 hover:underline">moneyrank.help@gmail.com</a>
          </p>
        </div>
      </div>
    </Layout>
  );
}

