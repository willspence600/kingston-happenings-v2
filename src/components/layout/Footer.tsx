'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Mail } from 'lucide-react';
import { Modal } from '@/components/ui';

export default function Footer() {
  const [showContactModal, setShowContactModal] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display text-xl">K</span>
              </div>
              <div>
                <span className="font-display text-xl text-foreground">Kingston</span>
                <span className="font-display text-xl text-primary ml-1">Happenings</span>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Your guide to everything happening in Kingston, Ontario. From concerts to trivia nights, 
              food specials to festivals – discover what&apos;s on in the Limestone City.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin size={16} />
              <span>Kingston, Ontario, Canada</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-lg mb-4">Explore</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/events" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  All Events
                </Link>
              </li>
              <li>
                <Link href="/calendar" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Calendar
                </Link>
              </li>
              <li>
                <Link href="/venues" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Venues
                </Link>
              </li>
              <li>
                <Link href="/events?category=concert" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Concerts
                </Link>
              </li>
              <li>
                <Link href="/events?category=food-deal" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Food Specials
                </Link>
              </li>
            </ul>
          </div>

          {/* For Organizers */}
          <div>
            <h3 className="font-display text-lg mb-4">For Organizers</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/submit" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Submit an Event
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Create Account
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <button 
                  onClick={() => setShowContactModal(true)}
                  className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center gap-1"
                >
                  <Mail size={14} />
                  Contact
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Kingston Happenings. All rights reserved.
          </p>
          <div className="text-sm text-muted-foreground text-center sm:text-right">
            <p>Built for Kingston, Ontario</p>
            <p className="text-xs">Supporting local events, venues & creators</p>
            <p className="text-xs mt-2">
              Having issues with the website?{' '}
              <button 
                onClick={() => setShowContactModal(true)}
                className="text-primary hover:underline"
              >
                Contact us
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Contact Us"
        message="Please email us at kingstonhappenings.ca@gmail.com"
        type="alert"
        confirmText="OK"
      />
    </footer>
  );
}

