'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Users, MapPin, Calendar, Mail, ArrowRight, Star } from 'lucide-react';
import { Modal } from '@/components';

export default function AboutPage() {
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-secondary via-secondary/95 to-primary/80 text-white py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 pattern-bg opacity-10" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-5xl sm:text-6xl mb-6">
            About <span className="italic text-accent">Kingston Happenings</span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Your comprehensive page to view everything happening in Kingston.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-primary font-medium text-sm uppercase tracking-wider mb-2">
                Our Story
              </p>
              <h2 className="font-display text-3xl sm:text-4xl text-foreground mb-6">
                Connecting Kingston Through Events
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Kingston Happenings was born from a simple idea: make it easy for 
                  everyone to discover what&apos;s going on in our beautiful city. Whether 
                  you&apos;re a lifelong resident, a Queen&apos;s student, or just visiting, 
                  there&apos;s always something happening in Kingston.
                </p>
                <p>
                  From trivia nights at local pubs to symphony performances at the Grand 
                  Theatre, from farmers markets at Market Square to hockey games at Leon&apos;s 
                  Centre — we curate it all in one place so you never miss out.
                </p>
                <p>
                  Our mission is to support Kingston&apos;s vibrant community of venues, 
                  restaurants, artists, and event organizers by helping them reach the 
                  people who want to be there.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <Calendar size={32} className="text-primary mx-auto mb-3" />
                <p className="text-3xl font-display text-foreground mb-1">X</p>
                <p className="text-sm text-muted-foreground">Events Listed</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <MapPin size={32} className="text-primary mx-auto mb-3" />
                <p className="text-3xl font-display text-foreground mb-1">X</p>
                <p className="text-sm text-muted-foreground">Local Venues</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <Users size={32} className="text-primary mx-auto mb-3" />
                <p className="text-3xl font-display text-foreground mb-1">X</p>
                <p className="text-sm text-muted-foreground">Monthly Visitors</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <Heart size={32} className="text-primary mx-auto mb-3" />
                <p className="text-3xl font-display text-foreground mb-1">100%</p>
                <p className="text-sm text-muted-foreground">Community Driven</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-primary font-medium text-sm uppercase tracking-wider mb-2">
              What We Offer
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-foreground">
              Everything You Need
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Users size={24} className="text-primary" />
              </div>
              <h3 className="font-display text-xl text-foreground mb-3">
                For Users
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Discover everything happening in Kingston with our comprehensive event listings.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-muted-foreground">
                  <Star size={16} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>Comprehensive listings of all events and food & drink specials</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <Star size={16} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>Custom area to save your favorite events</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <Star size={16} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>Get notified about events you pick</span>
                </li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Calendar size={24} className="text-primary" />
              </div>
              <h3 className="font-display text-xl text-foreground mb-3">
                For Organizers
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We make it easier than ever to showcase all of your venue&apos;s events and specials.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-muted-foreground">
                  <Star size={16} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>Easy event and special submission process</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <Star size={16} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>Put all your venue&apos;s events and specials in one place</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <Star size={16} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>Reach everyone in Kingston on a website they all have access to</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 sm:p-12 text-center text-white">
            <h2 className="font-display text-3xl sm:text-4xl mb-4">
              Have Questions?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              We&apos;d love to hear from you. Whether you&apos;re an event organizer, 
              venue owner, or just curious, don&apos;t hesitate to reach out.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                onClick={() => setShowContactModal(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-medium hover:bg-white/90 transition-colors"
              >
                <Mail size={18} />
                Contact Us
              </button>
              <Link
                href="/submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Submit an Event
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Modal */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Contact Us"
        message="Please email us at kingstonhappenings.ca@gmail.com"
        type="alert"
        confirmText="OK"
      />
    </div>
  );
}

