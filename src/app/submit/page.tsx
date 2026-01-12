'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
  Send,
  CheckCircle,
  Info,
  AlertCircle,
  Loader2,
  Plus,
  X,
  LogIn,
  Repeat,
  Utensils
} from 'lucide-react';
import { categoryLabels, EventCategory, browseCategories } from '@/types/event';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { DatePicker, VenueSelector } from '@/components';
import { addDays, parseISO, format } from 'date-fns';

// Generate a unique ID (compatible with older browsers)
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Generate time options for dropdown (every 15 minutes)
const generateTimeOptions = () => {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      const value = `${h}:${m}`;
      
      // Format for display (12-hour with AM/PM)
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const label = `${displayHour}:${m.padStart(2, '0')} ${ampm}`;
      
      options.push({ value, label });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

// Normalize URL - add https:// if missing
const normalizeUrl = (url: string): string => {
  if (!url) return '';
  url = url.trim();
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

type PriceType = 'na' | 'free' | 'amount';
type RecurrencePattern = 'none' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
type FormType = 'select' | 'event' | 'special';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface EventFormData {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  venueId: string;
  newVenueName: string;
  newVenueAddress: string;
  categories: EventCategory[];
  priceType: PriceType;
  priceAmount: string;
  ticketUrl: string;
  imageFile: File | null;
  imagePreview: string;
  // Recurrence fields
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceEndDate: string;
  // Multiple dates option
  customDates: string[];
  // All day option
  isAllDay: boolean;
}

interface SpecialFormData {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  venueId: string;
  newVenueName: string;
  newVenueAddress: string;
  categories: ('food' | 'drink')[];
  price: string;
  imageFile: File | null;
  imagePreview: string;
  isAllDay: boolean;
  // Recurring fields
  isRecurring: boolean;
  recurrencePattern: 'none' | 'weekly' | 'days';
  recurrenceEndDate: string;
  recurringDays: string[]; // Array of day names like ['Monday', 'Wednesday']
}

const createEmptyForm = (): EventFormData => ({
  id: generateId(),
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  venueId: '',
  newVenueName: '',
  newVenueAddress: '',
  categories: [],
  priceType: 'na',
  priceAmount: '',
  ticketUrl: '',
  imageFile: null,
  imagePreview: '',
  isRecurring: false,
  recurrencePattern: 'none',
  recurrenceEndDate: '',
  customDates: [],
  isAllDay: false,
});

const createEmptySpecialForm = (): SpecialFormData => ({
  id: generateId(),
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  venueId: '',
  newVenueName: '',
  newVenueAddress: '',
  categories: [],
  price: '',
  imageFile: null,
  imagePreview: '',
  isAllDay: false,
  isRecurring: false,
  recurrencePattern: 'none',
  recurrenceEndDate: '',
  recurringDays: [],
});

const MAX_DESCRIPTION_LENGTH = 500;

export default function SubmitEventPage() {
  const router = useRouter();
  const { user, isAdmin, isOrganizer, isLoading: authLoading } = useAuth();
  const { submitEvent, venues } = useEvents();
  
  const [formType, setFormType] = useState<FormType>('select');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [eventForms, setEventForms] = useState<EventFormData[]>([createEmptyForm()]);
  const [specialForms, setSpecialForms] = useState<SpecialFormData[]>([createEmptySpecialForm()]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleCategoryToggle = (formId: string, category: EventCategory) => {
    setEventForms(prev => prev.map(form => {
      if (form.id !== formId) return form;
      return {
        ...form,
        categories: form.categories.includes(category)
          ? form.categories.filter(c => c !== category)
          : [...form.categories, category]
      };
    }));
  };

  const handleSpecialCategoryToggle = (formId: string, category: 'food' | 'drink') => {
    setSpecialForms(prev => prev.map(form => {
      if (form.id !== formId) return form;
      return {
        ...form,
        categories: form.categories.includes(category)
          ? form.categories.filter(c => c !== category)
          : [...form.categories, category]
      };
    }));
  };

  const updateForm = (formId: string, updates: Partial<EventFormData>) => {
    setEventForms(prev => prev.map(form => 
      form.id === formId ? { ...form, ...updates } : form
    ));
  };

  const updateSpecialForm = (formId: string, updates: Partial<SpecialFormData>) => {
    setSpecialForms(prev => prev.map(form => 
      form.id === formId ? { ...form, ...updates } : form
    ));
  };

  const handleImageDrop = useCallback((formId: string, e: React.DragEvent<HTMLDivElement>, isSpecial = false) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(formId, file, isSpecial);
    }
  }, []);

  const handleImageSelect = (formId: string, file: File, isSpecial = false) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (isSpecial) {
        updateSpecialForm(formId, {
          imageFile: file,
          imagePreview: e.target?.result as string
        });
      } else {
      updateForm(formId, {
        imageFile: file,
        imagePreview: e.target?.result as string
      });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (formId: string, e: React.ChangeEvent<HTMLInputElement>, isSpecial = false) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(formId, file, isSpecial);
    }
  };

  const removeImage = (formId: string, isSpecial = false) => {
    if (isSpecial) {
      updateSpecialForm(formId, { imageFile: null, imagePreview: '' });
    } else {
    updateForm(formId, { imageFile: null, imagePreview: '' });
    }
    if (fileInputRefs.current[formId]) {
      fileInputRefs.current[formId]!.value = '';
    }
  };

  const addAnotherEvent = () => {
    setEventForms(prev => [...prev, createEmptyForm()]);
  };

  const addAnotherSpecial = () => {
    setSpecialForms(prev => [...prev, createEmptySpecialForm()]);
  };

  const removeEventForm = (formId: string) => {
    if (eventForms.length > 1) {
      setEventForms(prev => prev.filter(form => form.id !== formId));
    }
  };

  const removeSpecialForm = (formId: string) => {
    if (specialForms.length > 1) {
      setSpecialForms(prev => prev.filter(form => form.id !== formId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formType === 'event') {
      // Validate all event forms
    for (const form of eventForms) {
      if (form.categories.length === 0) {
        setError(`Please select at least one category for "${form.title || 'untitled event'}"`);
        return;
      }

      if (!form.venueId) {
        setError(`Please select a venue or create a new one for "${form.title || 'untitled event'}"`);
        return;
      }

      if (form.venueId === 'new' && (!form.newVenueName || !form.newVenueAddress)) {
        setError(`Please provide both venue name and address for "${form.title || 'untitled event'}"`);
        return;
      }

      // Validate recurring weekly events require an end date
      if (form.isRecurring && form.recurrencePattern === 'weekly' && !form.recurrenceEndDate) {
        setError(`Please select an end date for the recurring weekly event "${form.title || 'untitled event'}". Maximum duration is 52 weeks.`);
        return;
      }

      // Validate recurrence end date is within 52 weeks
      if (form.isRecurring && form.recurrencePattern === 'weekly' && form.recurrenceEndDate && form.date) {
        const startDate = new Date(form.date);
        const endDate = new Date(form.recurrenceEndDate);
        const weeksDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weeksDiff > 52) {
          setError(`The recurrence period for "${form.title || 'untitled event'}" cannot exceed 52 weeks. Please select an end date within 52 weeks from the start date.`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      // Submit all events
      for (const form of eventForms) {
        const imageUrl = form.imagePreview || undefined;

        let priceString: string | undefined;
        if (form.priceType === 'free') {
          priceString = 'Free';
        } else if (form.priceType === 'amount' && form.priceAmount) {
          priceString = `$${form.priceAmount}`;
        }

        await submitEvent({
          title: form.title,
          description: form.description,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime || undefined,
          venueId: form.venueId === 'new' ? 'new' : form.venueId || undefined,
          newVenueName: form.venueId === 'new' ? form.newVenueName : undefined,
          newVenueAddress: form.venueId === 'new' ? form.newVenueAddress : undefined,
          categories: form.categories,
          price: priceString,
          ticketUrl: normalizeUrl(form.ticketUrl) || undefined,
          imageUrl,
          isRecurring: form.isRecurring,
          recurrencePattern: form.isRecurring ? form.recurrencePattern : undefined,
          recurrenceEndDate: form.isRecurring ? form.recurrenceEndDate || undefined : undefined,
        });
      }

      setIsSubmitted(true);
      console.log('[Submit] Events submitted successfully');
    } catch (err) {
      console.error('[Submit] Error submitting events:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit event(s). Please try again.');
    } finally {
      setIsSubmitting(false);
      }
    } else if (formType === 'special') {
      // Validate all special forms
      for (const form of specialForms) {
        if (form.categories.length === 0) {
          setError(`Please select at least one category (Food or Drink) for "${form.title || 'untitled special'}"`);
          return;
        }

        if (!form.venueId) {
          setError(`Please select a venue or create a new one for "${form.title || 'untitled special'}"`);
          return;
        }

        if (form.venueId === 'new' && (!form.newVenueName || !form.newVenueAddress)) {
          setError(`Please provide both venue name and address for "${form.title || 'untitled special'}"`);
          return;
        }

        // Validate recurring weekly specials require an end date
        if (form.isRecurring && form.recurrencePattern === 'weekly' && !form.recurrenceEndDate) {
          setError(`Please select an end date for the recurring weekly special "${form.title || 'untitled special'}". Maximum duration is 52 weeks.`);
          return;
        }

        // Validate recurrence end date is within 52 weeks
        if (form.isRecurring && form.recurrencePattern === 'weekly' && form.recurrenceEndDate && form.date) {
          const startDate = new Date(form.date);
          const endDate = new Date(form.recurrenceEndDate);
          const weeksDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          if (weeksDiff > 52) {
            setError(`The recurrence period for "${form.title || 'untitled special'}" cannot exceed 52 weeks. Please select an end date within 52 weeks from the start date.`);
            return;
          }
        }
      }

      setIsSubmitting(true);

      try {
        // Submit all specials
        for (const form of specialForms) {
          const imageUrl = form.imagePreview || undefined;

          // Convert special categories to EventCategory format
          // Store both 'food-deal' (for general filtering) and 'food'/'drink' (for specific filtering)
          const categories: EventCategory[] = ['food-deal'];
          if (form.categories.includes('food')) categories.push('food');
          if (form.categories.includes('drink')) categories.push('drink');

          // Handle recurring specials
          if (form.isRecurring && form.recurrencePattern === 'days' && form.recurringDays.length > 0) {
            // For "days" pattern, create a separate event for each selected day
            for (const day of form.recurringDays) {
              // Calculate the first occurrence date for this day
              const startDate = new Date(form.date);
              const dayIndex = dayNames.indexOf(day);
              const currentDayIndex = startDate.getDay();
              let daysToAdd = dayIndex - currentDayIndex;
              if (daysToAdd < 0) daysToAdd += 7;
              startDate.setDate(startDate.getDate() + daysToAdd);

              await submitEvent({
                title: form.title,
                description: form.description,
                date: startDate.toISOString().split('T')[0],
                startTime: form.startTime,
                endTime: form.endTime || undefined,
                venueId: form.venueId === 'new' ? 'new' : form.venueId || undefined,
                newVenueName: form.venueId === 'new' ? form.newVenueName : undefined,
                newVenueAddress: form.venueId === 'new' ? form.newVenueAddress : undefined,
                categories,
                price: form.price || undefined,
                ticketUrl: undefined,
                imageUrl,
                isRecurring: true,
                recurrencePattern: 'weekly',
                recurrenceEndDate: form.recurrenceEndDate || undefined,
              });
            }
          } else {
            // For weekly or non-recurring specials
            await submitEvent({
              title: form.title,
              description: form.description,
              date: form.date,
              startTime: form.startTime,
              endTime: form.endTime || undefined,
              venueId: form.venueId === 'new' ? 'new' : form.venueId || undefined,
              newVenueName: form.venueId === 'new' ? form.newVenueName : undefined,
              newVenueAddress: form.venueId === 'new' ? form.newVenueAddress : undefined,
              categories,
              price: form.price || undefined,
              ticketUrl: undefined,
              imageUrl,
              isRecurring: form.isRecurring,
              recurrencePattern: form.isRecurring && form.recurrencePattern === 'weekly' ? 'weekly' : undefined,
              recurrenceEndDate: form.isRecurring ? (form.recurrenceEndDate || undefined) : undefined,
            });
          }
        }

        setIsSubmitted(true);
      } catch (err) {
        setError('Failed to submit special(s). Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  // Require login to submit events
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <LogIn size={40} className="text-primary" />
          </div>
          <h1 className="font-display text-3xl text-foreground mb-4">
            Login Required
          </h1>
          <p className="text-muted-foreground mb-8">
            You need to be logged in to submit events. Create an account or log in to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login?redirect=/submit"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              Log In
            </Link>
            <Link
              href="/register?redirect=/submit"
              className="px-6 py-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="font-display text-3xl text-foreground mb-4">
            {formType === 'event'
              ? (eventForms.length > 1 ? 'Events Submitted!' : 'Event Submitted!')
              : (specialForms.length > 1 ? 'Specials Submitted!' : 'Special Submitted!')
            }
          </h1>
          <p className="text-muted-foreground mb-8">
            {isAdmin 
              ? `Your ${formType === 'event' 
                  ? (eventForms.length > 1 ? 'events have' : 'event has')
                  : (specialForms.length > 1 ? 'specials have' : 'special has')
                } been published and ${formType === 'event'
                  ? (eventForms.length > 1 ? 'are' : 'is')
                  : (specialForms.length > 1 ? 'are' : 'is')
                } now live on the site.`
              : isOrganizer
                ? `Your ${formType === 'event'
                    ? (eventForms.length > 1 ? 'events have' : 'event has')
                    : (specialForms.length > 1 ? 'specials have' : 'special has')
                  } been submitted and will be reviewed shortly. ${formType === 'event'
                    ? (eventForms.length > 1 ? 'They' : 'It')
                    : (specialForms.length > 1 ? 'They' : 'It')
                  } should appear on the site within a few hours.`
                : `Thank you for submitting your ${formType === 'event'
                    ? (eventForms.length > 1 ? 'events' : 'event')
                    : (specialForms.length > 1 ? 'specials' : 'special')
                  }. Our team will review ${formType === 'event'
                    ? (eventForms.length > 1 ? 'them' : 'it')
                    : (specialForms.length > 1 ? 'them' : 'it')
                  } and ${formType === 'event'
                    ? (eventForms.length > 1 ? 'they' : 'it')
                    : (specialForms.length > 1 ? 'they' : 'it')
                  } should appear on the site within 24 hours.`
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              Back to Home
            </Link>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setFormType('select');
                setEventForms([createEmptyForm()]);
                setSpecialForms([createEmptySpecialForm()]);
              }}
              className="px-6 py-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
            >
              Submit More
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show initial selection screen
  if (formType === 'select') {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-secondary to-primary/80 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl sm:text-5xl mb-4">
              Submit to Kingston Happenings
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
              Share your event or special with Kingston&apos;s community.
            {isAdmin 
                ? ' As an admin, your submissions will be published immediately.'
                : isOrganizer
                  ? ' As an organizer, your submissions will be reviewed and published quickly.'
                  : ' Fill out the form and we\'ll review it within 24 hours.'
              }
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setFormType('event')}
              className="group p-8 bg-card border-2 border-border rounded-2xl hover:border-primary hover:shadow-lg transition-all text-left"
            >
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Calendar size={32} className="text-primary" />
              </div>
              <h2 className="font-display text-2xl text-foreground mb-2">Submit Event</h2>
              <p className="text-muted-foreground">
                Submit concerts, workshops, sports events, and more to the Kingston community calendar.
              </p>
            </button>

            <button
              onClick={() => setFormType('special')}
              className="group p-8 bg-card border-2 border-border rounded-2xl hover:border-primary hover:shadow-lg transition-all text-left"
            >
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Utensils size={32} className="text-primary" />
              </div>
              <h2 className="font-display text-2xl text-foreground mb-2">Submit Food & Drink Special</h2>
              <p className="text-muted-foreground">
                Share your restaurant or bar specials, happy hours, and food deals with hungry Kingstonians.
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-secondary to-primary/80 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl mb-4">
                {formType === 'event' 
                  ? `Submit ${eventForms.length > 1 ? 'Events' : 'an Event'}`
                  : `Submit ${specialForms.length > 1 ? 'Food & Drink Specials' : 'Food & Drink Special'}`
                }
              </h1>
              <p className="text-white/80 text-lg max-w-2xl">
                {formType === 'event'
                  ? 'Share your event with Kingston\'s community.'
                  : 'Share your food or drink special with Kingston\'s community.'
                }
                {isAdmin 
                  ? ' As an admin, your submissions will be published immediately.'
                  : isOrganizer
                    ? ' As an organizer, your submissions will be reviewed and published quickly.'
              : ' Fill out the form below and we\'ll review it within 24 hours.'
            }
          </p>
            </div>
            <button
              onClick={() => {
                setFormType('select');
                setEventForms([createEmptyForm()]);
                setSpecialForms([createEmptySpecialForm()]);
                setError('');
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isAdmin && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 flex items-start gap-3">
            <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-green-800 font-medium">Admin Mode</p>
              <p className="text-sm text-green-700">
                Your submissions will be automatically approved and published.
              </p>
            </div>
          </div>
        )}
        {isOrganizer && !isAdmin && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3">
            <CheckCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">Organizer Account</p>
              <p className="text-sm text-blue-700">
                Your submissions will be prioritized for review and typically published within a few hours.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Event Forms - only show when formType === 'event' */}
          {formType === 'event' && eventForms.map((formData, formIndex) => (
            <div key={formData.id} className="relative">
              {eventForms.length > 1 && (
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-2xl text-foreground">
                    Event {formIndex + 1}
                  </h2>
                  <button
                    type="button"
                    onClick={() => removeEventForm(formData.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={16} />
                    Remove
                  </button>
                </div>
              )}

              {/* Event Details */}
              <section className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
                  <FileText size={20} className="text-primary" />
                  Event Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor={`title-${formData.id}`} className="block text-sm font-medium text-foreground mb-2">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      id={`title-${formData.id}`}
                      required
                      value={formData.title}
                      onChange={(e) => updateForm(formData.id, { title: e.target.value })}
                      placeholder="e.g., Trivia Night at The Ale House"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor={`description-${formData.id}`} className="block text-sm font-medium text-foreground mb-2">
                      Description *
                    </label>
                    <textarea
                      id={`description-${formData.id}`}
                      required
                      rows={4}
                      maxLength={MAX_DESCRIPTION_LENGTH}
                      value={formData.description}
                      onChange={(e) => updateForm(formData.id, { description: e.target.value })}
                      placeholder="Tell people what they can expect at your event..."
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                    />
                    <div className="flex justify-end mt-1">
                      <span className={`text-xs ${formData.description.length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Date & Time */}
              <section className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
                  <Calendar size={20} className="text-primary" />
                  Date & Time
                </h3>
                
                {/* All Day toggle */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAllDay}
                      onChange={(e) => updateForm(formData.id, { 
                        isAllDay: e.target.checked,
                        startTime: e.target.checked ? '00:00' : '',
                        endTime: ''
                      })}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-foreground">This is an all-day event</span>
                  </label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor={`date-${formData.id}`} className="block text-sm font-medium text-foreground mb-2">
                      Date *
                    </label>
                    <DatePicker
                      id={`date-${formData.id}`}
                      value={formData.date}
                      onChange={(value) => updateForm(formData.id, { date: value })}
                      required
                      placeholder="Select date"
                    />
                  </div>

                  {!formData.isAllDay && (
                    <>
                      <div>
                        <label htmlFor={`startTime-${formData.id}`} className="block text-sm font-medium text-foreground mb-2">
                          Start Time *
                        </label>
                        <div className="relative">
                          <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                          <input
                            type="time"
                            id={`startTime-${formData.id}`}
                            required
                            value={formData.startTime}
                            onChange={(e) => updateForm(formData.id, { startTime: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`endTime-${formData.id}`} className="block text-sm font-medium text-foreground mb-2">
                          End Time
                        </label>
                        <div className="relative">
                          <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                          <input
                            type="time"
                            id={`endTime-${formData.id}`}
                            value={formData.endTime}
                            onChange={(e) => updateForm(formData.id, { endTime: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Recurring Event Options */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={(e) => updateForm(formData.id, { 
                          isRecurring: e.target.checked,
                          recurrencePattern: e.target.checked ? 'weekly' : 'none',
                          recurrenceEndDate: ''
                        })}
                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                      <Repeat size={16} className="text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">This is a recurring event</span>
                    </label>
                  </div>

                  {formData.isRecurring && (
                    <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Repeat Pattern
                          </label>
                          <select
                            value={formData.recurrencePattern}
                            onChange={(e) => updateForm(formData.id, { 
                              recurrencePattern: e.target.value as RecurrencePattern,
                              customDates: []
                            })}
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                          >
                            <option value="weekly">Every week</option>
                            <option value="biweekly">Every 2 weeks</option>
                            <option value="monthly">Every month</option>
                            <option value="custom">Multiple specific dates</option>
                          </select>
                          {formData.date && formData.recurrencePattern !== 'custom' && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Every {formData.recurrencePattern === 'monthly' ? 'month' : ''} {dayNames[new Date(formData.date + 'T12:00:00').getDay()]}
                              {formData.recurrencePattern === 'biweekly' ? ' (every 2 weeks)' : ''}
                            </p>
                          )}
                        </div>
                        {formData.recurrencePattern !== 'custom' && (
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Until{formData.recurrencePattern === 'weekly' ? ' *' : ''}
                            </label>
                            <DatePicker
                              value={formData.recurrenceEndDate}
                              onChange={(value) => updateForm(formData.id, { recurrenceEndDate: value })}
                              min={formData.date}
                              max={formData.recurrencePattern === 'weekly' && formData.date ? (() => {
                                try {
                                  const startDate = parseISO(formData.date);
                                  return format(addDays(startDate, 52 * 7), 'yyyy-MM-dd');
                                } catch {
                                  return undefined;
                                }
                              })() : undefined}
                              required={formData.recurrencePattern === 'weekly'}
                              placeholder={formData.recurrencePattern === 'weekly' ? 'Select end date (required, max 52 weeks)' : 'Select end date'}
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                              {formData.recurrencePattern === 'weekly' 
                                ? 'Required. Maximum duration is 52 weeks from the start date.'
                                : 'Leave empty for no end date (max 52 weeks)'}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Custom dates picker */}
                      {formData.recurrencePattern === 'custom' && (
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Select Additional Dates
                          </label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {formData.customDates.map((date, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded-lg"
                              >
                                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                <button
                                  type="button"
                                  onClick={() => updateForm(formData.id, { 
                                    customDates: formData.customDates.filter((_, i) => i !== idx)
                                  })}
                                  className="hover:text-red-500"
                                >
                                  <X size={14} />
                                </button>
                              </span>
                            ))}
                          </div>
                          <DatePicker
                            value=""
                            onChange={(value) => {
                              if (value && !formData.customDates.includes(value)) {
                                updateForm(formData.id, { 
                                  customDates: [...formData.customDates, value].sort()
                                });
                              }
                            }}
                            min={formData.date}
                            placeholder="Click to add date"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Click dates to add them. The first date is set above.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Location */}
              <section className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
                  <MapPin size={20} className="text-primary" />
                  Location
                </h3>
                
                <VenueSelector
                  venues={venues}
                  selectedVenueId={formData.venueId}
                  newVenueName={formData.newVenueName}
                  newVenueAddress={formData.newVenueAddress}
                  onVenueSelect={(venueId) => updateForm(formData.id, { venueId })}
                  onNewVenueNameChange={(name) => updateForm(formData.id, { newVenueName: name })}
                  onNewVenueAddressChange={(address) => updateForm(formData.id, { newVenueAddress: address })}
                  required
                  id={`venue-${formData.id}`}
                />
              </section>

              {/* Categories */}
              <section className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-display text-xl text-foreground mb-2 flex items-center gap-2">
                  <Tag size={20} className="text-primary" />
                  Categories *
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select all that apply (at least one required)
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {browseCategories.map((category) => {
                    const isSelected = formData.categories.includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleCategoryToggle(formData.id, category)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-border'
                        }`}
                      >
                        {categoryLabels[category]}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Additional Info */}
              <section className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
                  <DollarSign size={20} className="text-primary" />
                  Additional Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Price / Admission
                    </label>
                    <div className="flex flex-wrap gap-3 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`priceType-${formData.id}`}
                          value="na"
                          checked={formData.priceType === 'na'}
                          onChange={() => updateForm(formData.id, { priceType: 'na', priceAmount: '' })}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">N/A</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`priceType-${formData.id}`}
                          value="free"
                          checked={formData.priceType === 'free'}
                          onChange={() => updateForm(formData.id, { priceType: 'free', priceAmount: '' })}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">Free</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`priceType-${formData.id}`}
                          value="amount"
                          checked={formData.priceType === 'amount'}
                          onChange={() => updateForm(formData.id, { priceType: 'amount' })}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">Paid</span>
                      </label>
                    </div>
                    {formData.priceType === 'amount' && (
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <input
                          type="text"
                          id={`priceAmount-${formData.id}`}
                          value={formData.priceAmount}
                          onChange={(e) => updateForm(formData.id, { priceAmount: e.target.value })}
                          placeholder="e.g., 15, 20-40"
                          className="w-full pl-8 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor={`ticketUrl-${formData.id}`} className="block text-sm font-medium text-foreground mb-2">
                      Ticket / Registration Link
                    </label>
                    <div className="relative">
                      <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        id={`ticketUrl-${formData.id}`}
                        value={formData.ticketUrl}
                        onChange={(e) => updateForm(formData.id, { ticketUrl: e.target.value })}
                        placeholder="e.g., ticketmaster.com/event/abc"
                        className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      You can enter the link with or without https://
                    </p>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Event Image
                    </label>
                    
                    {formData.imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden">
                        <img
                          src={formData.imagePreview}
                          alt="Event preview"
                          className="w-full h-48 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(formData.id)}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleImageDrop(formData.id, e)}
                        onClick={() => fileInputRefs.current[formData.id]?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      >
                        <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-foreground font-medium mb-1">
                          Drop an image here or click to upload
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, GIF up to 5MB. Recommended: 800x600px
                        </p>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      ref={(el) => { fileInputRefs.current[formData.id] = el; }}
                      onChange={(e) => handleFileInputChange(formData.id, e)}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </section>

              {formIndex < eventForms.length - 1 && (
                <div className="border-b-2 border-dashed border-border my-8" />
              )}
            </div>
          ))}

          {/* Food & Drink Special Forms */}
          {formType === 'special' && specialForms.map((formData, formIndex) => (
            <div key={formData.id} className="relative">
              {specialForms.length > 1 && (
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-2xl text-foreground">
                    Special {formIndex + 1}
                  </h2>
                  <button
                    type="button"
                    onClick={() => removeSpecialForm(formData.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={16} />
                    Remove
                  </button>
                </div>
              )}

              {/* Special Details */}
              <section className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
                  <Utensils size={20} className="text-primary" />
                  Special Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor={`special-title-${formData.id}`} className="block text-sm font-medium text-foreground mb-2">
                      Special Title *
                    </label>
                    <input
                      type="text"
                      id={`special-title-${formData.id}`}
                      required
                      value={formData.title}
                      onChange={(e) => updateSpecialForm(formData.id, { title: e.target.value })}
                      placeholder="e.g., Half-Price Wings Wednesday"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor={`special-description-${formData.id}`} className="block text-sm font-medium text-foreground mb-2">
                      Description *
                    </label>
                    <textarea
                      id={`special-description-${formData.id}`}
                      required
                      rows={4}
                      maxLength={MAX_DESCRIPTION_LENGTH}
                      value={formData.description}
                      onChange={(e) => updateSpecialForm(formData.id, { description: e.target.value })}
                      placeholder="Describe your special, including any restrictions or details..."
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                    />
                    <div className="flex justify-end mt-1">
                      <span className={`text-xs ${formData.description.length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Date & Time */}
              <section className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
                  <Calendar size={20} className="text-primary" />
                  Date & Time
                </h3>
                
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAllDay}
                      onChange={(e) => updateSpecialForm(formData.id, { 
                        isAllDay: e.target.checked,
                        startTime: e.target.checked ? '00:00' : '',
                        endTime: ''
                      })}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-foreground">This is an all-day special</span>
                  </label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor={`special-date-${formData.id}`} className="block text-sm font-medium text-foreground mb-2">
                      Date *
                    </label>
                    <DatePicker
                      id={`special-date-${formData.id}`}
                      value={formData.date}
                      onChange={(value) => updateSpecialForm(formData.id, { date: value })}
                      required
                      placeholder="Select date"
                    />
                  </div>

                  {!formData.isAllDay && (
                    <>
                      <div>
                        <label htmlFor={`special-startTime-${formData.id}`} className="block text-sm font-medium text-foreground mb-2">
                          Start Time *
                        </label>
                        <div className="relative">
                          <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                          <input
                            type="time"
                            id={`special-startTime-${formData.id}`}
                            required
                            value={formData.startTime}
                            onChange={(e) => updateSpecialForm(formData.id, { startTime: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`special-endTime-${formData.id}`} className="block text-sm font-medium text-foreground mb-2">
                          End Time
                        </label>
                        <div className="relative">
                          <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                          <input
                            type="time"
                            id={`special-endTime-${formData.id}`}
                            value={formData.endTime}
                            onChange={(e) => updateSpecialForm(formData.id, { endTime: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Recurring Special Options */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={(e) => updateSpecialForm(formData.id, { 
                          isRecurring: e.target.checked,
                          recurrencePattern: e.target.checked ? 'weekly' : 'none',
                          recurrenceEndDate: '',
                          recurringDays: []
                        })}
                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                      <Repeat size={16} className="text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">This is a recurring special</span>
                    </label>
                  </div>

                  {formData.isRecurring && (
                    <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Recurrence Type
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`recurrence-type-${formData.id}`}
                              checked={formData.recurrencePattern === 'weekly'}
                              onChange={() => updateSpecialForm(formData.id, { 
                                recurrencePattern: 'weekly',
                                recurringDays: []
                              })}
                              className="w-4 h-4 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-foreground">Weekly (same day each week)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`recurrence-type-${formData.id}`}
                              checked={formData.recurrencePattern === 'days'}
                              onChange={() => updateSpecialForm(formData.id, { 
                                recurrencePattern: 'days',
                                recurrenceEndDate: ''
                              })}
                              className="w-4 h-4 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-foreground">Select specific days of the week</span>
                          </label>
                        </div>
                      </div>

                      {formData.recurrencePattern === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Until *
                          </label>
                          <DatePicker
                            value={formData.recurrenceEndDate}
                            onChange={(value) => updateSpecialForm(formData.id, { recurrenceEndDate: value })}
                            min={formData.date}
                            max={formData.date ? (() => {
                              try {
                                const startDate = parseISO(formData.date);
                                return format(addDays(startDate, 52 * 7), 'yyyy-MM-dd');
                              } catch {
                                return undefined;
                              }
                            })() : undefined}
                            required
                            placeholder="Select end date (required, max 52 weeks)"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Required. Maximum duration is 52 weeks from the start date.
                          </p>
                        </div>
                      )}

                      {formData.recurrencePattern === 'days' && (
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Select Days
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {dayNames.map((day) => (
                              <label key={day} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors">
                                <input
                                  type="checkbox"
                                  checked={formData.recurringDays.includes(day)}
                                  onChange={(e) => {
                                    const newDays = e.target.checked
                                      ? [...formData.recurringDays, day]
                                      : formData.recurringDays.filter(d => d !== day);
                                    updateSpecialForm(formData.id, { recurringDays: newDays });
                                  }}
                                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                                />
                                <span className="text-sm text-foreground">{day}</span>
                              </label>
                            ))}
                          </div>
                          {formData.recurringDays.length > 0 && (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Until
                              </label>
                              <input
                                type="date"
                                value={formData.recurrenceEndDate}
                                onChange={(e) => updateSpecialForm(formData.id, { recurrenceEndDate: e.target.value })}
                                min={formData.date}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                              />
                              <p className="text-xs text-muted-foreground mt-2">
                                Leave empty for no end date (max 52 weeks)
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Location */}
              <section className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
                  <MapPin size={20} className="text-primary" />
                  Location
                </h3>
                
                <VenueSelector
                  venues={venues}
                  selectedVenueId={formData.venueId}
                  newVenueName={formData.newVenueName}
                  newVenueAddress={formData.newVenueAddress}
                  onVenueSelect={(venueId) => updateSpecialForm(formData.id, { venueId })}
                  onNewVenueNameChange={(name) => updateSpecialForm(formData.id, { newVenueName: name })}
                  onNewVenueAddressChange={(address) => updateSpecialForm(formData.id, { newVenueAddress: address })}
                  required
                  id={`special-venue-${formData.id}`}
                />
              </section>

              {/* Categories */}
              <section className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-display text-xl text-foreground mb-2 flex items-center gap-2">
                  <Tag size={20} className="text-primary" />
                  Categories *
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select Food, Drink, or both
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {(['food', 'drink'] as const).map((category) => {
                    const isSelected = formData.categories.includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleSpecialCategoryToggle(formData.id, category)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-border'
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Price */}
              <section className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
                  <DollarSign size={20} className="text-primary" />
                  Price
                </h3>
                
                <div>
                  <label htmlFor={`special-price-${formData.id}`} className="block text-sm font-medium text-foreground mb-2">
                    Special Price
                  </label>
                  <input
                    type="text"
                    id={`special-price-${formData.id}`}
                    value={formData.price}
                    onChange={(e) => updateSpecialForm(formData.id, { price: e.target.value })}
                    placeholder="e.g., $5 Pints, Half-Price Wings, $12 Burger & Pint"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Describe the special pricing (e.g., "$5 Pints", "50% Off", "Buy One Get One")
                  </p>
                </div>
              </section>

              {/* Image Upload */}
              <section className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-display text-xl text-foreground mb-6 flex items-center gap-2">
                  <Upload size={20} className="text-primary" />
                  Special Image
                </h3>
                
                {formData.imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img
                      src={formData.imagePreview}
                      alt="Special preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(formData.id, true)}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleImageDrop(formData.id, e, true)}
                    onClick={() => fileInputRefs.current[formData.id]?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-foreground font-medium mb-1">
                      Drop an image here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF up to 5MB. Recommended: 800x600px
                    </p>
                  </div>
                )}
                
                <input
                  type="file"
                  ref={(el) => { fileInputRefs.current[formData.id] = el; }}
                  onChange={(e) => handleFileInputChange(formData.id, e, true)}
                  accept="image/*"
                  className="hidden"
                />
              </section>

              {formIndex < specialForms.length - 1 && (
                <div className="border-b-2 border-dashed border-border my-8" />
              )}
            </div>
          ))}

          {/* Add Another Button */}
          {formType === 'event' && (
          <button
            type="button"
            onClick={addAnotherEvent}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-border rounded-xl font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            <Plus size={20} />
            Add Another Event
          </button>
          )}

          {formType === 'special' && (
            <button
              type="button"
              onClick={addAnotherSpecial}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-border rounded-xl font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <Plus size={20} />
              Add Another Special
            </button>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-medium text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send size={20} />
                {formType === 'event' 
                  ? (isAdmin 
                  ? `Publish ${eventForms.length > 1 ? 'Events' : 'Event'}` 
                      : `Submit ${eventForms.length > 1 ? 'Events' : 'Event'} for Review`)
                  : (isAdmin 
                      ? `Publish ${specialForms.length > 1 ? 'Specials' : 'Special'}` 
                      : `Submit ${specialForms.length > 1 ? 'Specials' : 'Special'} for Review`)
                }
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
