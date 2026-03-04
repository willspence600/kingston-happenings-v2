'use client';

import { use, useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Tag,
  DollarSign,
  Upload,
  Link as LinkIcon,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ArrowLeft,
} from 'lucide-react';
import { categoryLabels, EventCategory, browseCategories } from '@/types/event';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { DatePicker, VenueSelector } from '@/components';

const normalizeUrl = (url: string): string => {
  if (!url) return '';
  url = url.trim();
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

type PriceType = 'na' | 'free' | 'amount';

const MAX_DESCRIPTION_LENGTH = 500;

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { getEventById, venues, refreshEvents } = useEvents();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const event = getEventById(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venueId, setVenueId] = useState('');
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [priceType, setPriceType] = useState<PriceType>('na');
  const [priceAmount, setPriceAmount] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (event && !initialized) {
      setTitle(event.title);
      setDescription(event.description);
      setDate(event.date);
      setStartTime(event.startTime);
      setEndTime(event.endTime || '');
      setVenueId(event.venue.id);
      setCategories((event.categories || []) as EventCategory[]);
      setImagePreview(event.imageUrl || '');
      setTicketUrl(event.ticketUrl || '');
      setIsAllDay(event.startTime === '00:00' && !event.endTime);

      if (event.price) {
        if (event.price === 'Free') {
          setPriceType('free');
        } else if (event.price.startsWith('$')) {
          setPriceType('amount');
          setPriceAmount(event.price.replace('$', ''));
        } else {
          setPriceType('amount');
          setPriceAmount(event.price);
        }
      }

      setInitialized(true);
    }
  }, [event, initialized]);

  const handleCategoryToggle = (category: EventCategory) => {
    setCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (categories.length === 0) {
      setError('Please select at least one category.');
      return;
    }
    if (!venueId) {
      setError('Please select a venue.');
      return;
    }

    setIsSubmitting(true);

    try {
      let priceString: string | undefined;
      if (priceType === 'free') priceString = 'Free';
      else if (priceType === 'amount' && priceAmount) priceString = `$${priceAmount}`;

      const body: Record<string, unknown> = {
        title,
        description,
        date,
        startTime: isAllDay ? '00:00' : startTime,
        endTime: isAllDay ? null : (endTime || null),
        venueId,
        categories,
        price: priceString || null,
        ticketUrl: normalizeUrl(ticketUrl) || null,
        imageUrl: imagePreview || null,
      };

      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update event');
      }

      setIsSaved(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await refreshEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-3xl text-foreground mb-4">Event Not Found</h1>
          <p className="text-muted-foreground mb-6">The event you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/events" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            <ArrowLeft size={18} /> Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const canEdit = user && (isAdmin || event.submittedById === user.id);

  if (!canEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-3xl text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don&apos;t have permission to edit this event.</p>
          <Link href={`/events/${id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            <ArrowLeft size={18} /> Back to Event
          </Link>
        </div>
      </div>
    );
  }

  if (isSaved) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="font-display text-3xl text-foreground mb-4">Event Updated!</h1>
          <p className="text-muted-foreground mb-8">Your changes have been saved successfully.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/events/${id}`} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium">
              View Event
            </Link>
            <button
              onClick={() => setIsSaved(false)}
              className="px-6 py-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
            >
              Continue Editing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-secondary to-primary/80 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl mb-4">Edit Event</h1>
              <p className="text-white/80 text-lg max-w-2xl">
                Update the details for &ldquo;{event.title}&rdquo;
              </p>
            </div>
            <Link
              href={`/events/${id}`}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
            >
              &larr; Back to Event
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Event Details */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              Event Details
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">Event Title *</label>
                <input
                  type="text"
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">Description *</label>
                <textarea
                  id="description"
                  required
                  rows={4}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${description.length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Date & Time */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
              <Calendar size={20} className="text-primary" />
              Date & Time
            </h3>
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => {
                    setIsAllDay(e.target.checked);
                    if (e.target.checked) { setStartTime('00:00'); setEndTime(''); }
                  }}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">This is an all-day event</span>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-foreground mb-2">Date *</label>
                <DatePicker id="date" value={date} onChange={setDate} required placeholder="Select date" />
              </div>
              {!isAllDay && (
                <>
                  <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-foreground mb-2">Start Time *</label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                      <input
                        type="time"
                        id="startTime"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-foreground mb-2">End Time</label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                      <input
                        type="time"
                        id="endTime"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Location */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
              <MapPin size={20} className="text-primary" />
              Location
            </h3>
            <VenueSelector
              venues={venues}
              selectedVenueId={venueId}
              newVenueName=""
              newVenueAddress=""
              onVenueSelect={setVenueId}
              onNewVenueNameChange={() => {}}
              onNewVenueAddressChange={() => {}}
              required
              id="venue"
            />
          </section>

          {/* Categories */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-xl text-foreground mb-2 flex items-center gap-2">
              <Tag size={20} className="text-primary" />
              Categories *
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {browseCategories.map((category) => {
                const isSelected = categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryToggle(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-border'
                    }`}
                  >
                    {categoryLabels[category]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Additional Info */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
              <DollarSign size={20} className="text-primary" />
              Additional Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Price / Admission</label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {(['na', 'free', 'amount'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="priceType"
                        value={type}
                        checked={priceType === type}
                        onChange={() => { setPriceType(type); if (type !== 'amount') setPriceAmount(''); }}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">{type === 'na' ? 'N/A' : type === 'free' ? 'Free' : 'Paid'}</span>
                    </label>
                  ))}
                </div>
                {priceType === 'amount' && (
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input
                      type="text"
                      value={priceAmount}
                      onChange={(e) => setPriceAmount(e.target.value)}
                      placeholder="e.g., 15, 20-40"
                      className="w-full pl-8 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="ticketUrl" className="block text-sm font-medium text-foreground mb-2">Ticket / Registration Link</label>
                <div className="relative">
                  <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    id="ticketUrl"
                    value={ticketUrl}
                    onChange={(e) => setTicketUrl(e.target.value)}
                    placeholder="e.g., ticketmaster.com/event/abc"
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Event Image</label>
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={imagePreview} alt="Event preview" className="w-full h-48 object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file?.type.startsWith('image/')) handleImageSelect(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-foreground font-medium mb-1">Drop an image here or click to upload</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(f); }}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-medium text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
