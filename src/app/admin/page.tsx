'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { 
  Shield, 
  Check, 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  FileText,
  AlertTriangle,
  Loader2,
  Building,
  Trash2,
  Ban,
  Repeat,
  Edit,
  Upload,
  Image as ImageIcon,
  Utensils,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { categoryLabels, categoryColors, EventCategory } from '@/types/event';
import { Modal, Toast } from '@/components';
import { compressImage } from '@/utils/compression';
import { formatPrice } from '@/utils/price';
import SmartImage from '@/components/ui/SmartImage';

interface PendingVenue {
  id: string;
  name: string;
  address: string;
  status: string;
  createdAt: string;
}

interface PublishedVenue {
  id: string;
  name: string;
  address: string;
  neighborhood?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  eventCount?: number;
  promotionTier?: string;
}

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'warning';
  confirmText: string;
  onConfirm: () => void;
  secondaryConfirmText?: string;
  onSecondaryConfirm?: () => void;
}

interface ToastState {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

type ListSort = 'date' | 'venue';

const initialModalState: ModalState = {
  isOpen: false,
  title: '',
  message: '',
  type: 'confirm',
  confirmText: 'Confirm',
  onConfirm: () => {},
};

function matchesSearch(
  event: { title: string; venue: { name: string } },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    event.title.toLowerCase().includes(q) ||
    event.venue.name.toLowerCase().includes(q)
  );
}

function sortEvents<T extends { date: string; venue: { name: string } }>(
  list: T[],
  sortBy: ListSort
): T[] {
  return [...list].sort((a, b) => {
    if (sortBy === 'venue') {
      const byVenue = a.venue.name.localeCompare(b.venue.name);
      if (byVenue !== 0) return byVenue;
      return a.date.localeCompare(b.date);
    }
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.venue.name.localeCompare(b.venue.name);
  });
}

function EditVenueForm({ 
  venue, 
  onSave, 
  onCancel 
}: { 
  venue: PublishedVenue; 
  onSave: (venue: PublishedVenue) => void; 
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<PublishedVenue>(venue);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState<'imageUrl' | 'coverImageUrl' | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(venue.imageUrl || '');
  const [coverImagePreview, setCoverImagePreview] = useState<string>(venue.coverImageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Update formData when venue changes
  useEffect(() => {
    setFormData(venue);
    setImagePreview(venue.imageUrl || '');
    setCoverImagePreview(venue.coverImageUrl || '');
  }, [venue]);

  const handleImageSelect = async (file: File, field: 'imageUrl' | 'coverImageUrl') => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    const compressed = await compressImage(file);
    if (field === 'imageUrl') {
      setImagePreview(compressed);
      setFormData((prev) => ({ ...prev, imageUrl: compressed }));
    } else {
      setCoverImagePreview(compressed);
      setFormData((prev) => ({ ...prev, coverImageUrl: compressed }));
    }
  };

  const handleDragOver = (e: React.DragEvent, field: 'imageUrl' | 'coverImageUrl') => {
    e.preventDefault();
    setIsDragging(field);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(null);
  };

  const handleDrop = (e: React.DragEvent, field: 'imageUrl' | 'coverImageUrl') => {
    e.preventDefault();
    setIsDragging(null);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageSelect(file, field);
    }
  };

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'imageUrl' | 'coverImageUrl'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file, field);
    }
  };

  const removeImage = (field: 'imageUrl' | 'coverImageUrl') => {
    if (field === 'imageUrl') {
      setImagePreview('');
      setFormData((prev) => ({ ...prev, imageUrl: undefined }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setCoverImagePreview('');
      setFormData((prev) => ({ ...prev, coverImageUrl: undefined }));
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  const renderImageField = (
    field: 'imageUrl' | 'coverImageUrl',
    label: string,
    preview: string,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {label}
      </label>
      <div
        onDragOver={(e) => handleDragOver(e, field)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, field)}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging === field
            ? 'border-primary bg-primary/10' 
            : 'border-border hover:border-primary/50'
          }
          ${preview ? 'p-2' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileInputChange(e, field)}
          className="hidden"
        />
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt={`${label} preview`}
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeImage(field);
              }}
              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click or drag and drop an image here
            </p>
            <p className="text-xs text-muted-foreground">
              Or enter a URL below
            </p>
          </div>
        )}
      </div>
      <input
        type="url"
        value={
          formData[field] && !formData[field]!.startsWith('data:')
            ? formData[field]!
            : ''
        }
        onChange={(e) => {
          setFormData({ ...formData, [field]: e.target.value });
          if (field === 'imageUrl') setImagePreview(e.target.value);
          else setCoverImagePreview(e.target.value);
        }}
        placeholder="Or enter image URL"
        className="w-full mt-2 px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Venue Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Address *
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          required
          className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Neighborhood
        </label>
        <input
          type="text"
          value={formData.neighborhood || ''}
          onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
          className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Website
        </label>
        <input
          type="url"
          value={formData.website || ''}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Promotion Tier
        </label>
        <select
          value={formData.promotionTier || 'standard'}
          onChange={(e) => setFormData({ ...formData, promotionTier: e.target.value })}
          className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        >
          <option value="standard">Standard</option>
          <option value="promoted">Promoted</option>
          <option value="featured">Featured</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          Promotion tier affects the priority order of events/specials in listings
        </p>
      </div>
      {renderImageField('imageUrl', 'Venue Thumbnail', imagePreview, fileInputRef)}
      {renderImageField('coverImageUrl', 'Cover Photo', coverImagePreview, coverFileInputRef)}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { pendingEvents, events, approveEvent, rejectEvent, refreshPendingEvents, refreshEvents, refreshVenues, isLoading: eventsLoading } = useEvents();
  const [pendingVenues, setPendingVenues] = useState<PendingVenue[]>([]);
  const [publishedVenues, setPublishedVenues] = useState<PublishedVenue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);
  const [editingVenue, setEditingVenue] = useState<PublishedVenue | null>(null);
  const [modal, setModal] = useState<ModalState>(initialModalState);
  const [toast, setToast] = useState<ToastState>({ isVisible: false, message: '', type: 'success' });
  const [processingEventId, setProcessingEventId] = useState<string | null>(null);
  const [clickedApproveId, setClickedApproveId] = useState<string | null>(null);
  const [clickedRejectId, setClickedRejectId] = useState<string | null>(null);
  const [publishedEventsPage, setPublishedEventsPage] = useState(1);
  const [publishedSpecialsPage, setPublishedSpecialsPage] = useState(1);
  const [pastEventsPage, setPastEventsPage] = useState(1);
  const [pastSpecialsPage, setPastSpecialsPage] = useState(1);
  const itemsPerPage = 20;
  const [activeSubTab, setActiveSubTab] = useState<'pending-published' | 'venue-promotions'>('pending-published');
  const [publishedEventsSort, setPublishedEventsSort] = useState<ListSort>('date');
  const [publishedSpecialsSort, setPublishedSpecialsSort] = useState<ListSort>('date');
  const [publishedEventsSearch, setPublishedEventsSearch] = useState('');
  const [publishedSpecialsSearch, setPublishedSpecialsSearch] = useState('');
  const [pastEventsSort, setPastEventsSort] = useState<ListSort>('date');
  const [pastSpecialsSort, setPastSpecialsSort] = useState<ListSort>('date');
  const [pastEventsSearch, setPastEventsSearch] = useState('');
  const [pastSpecialsSearch, setPastSpecialsSearch] = useState('');
  const [pastEventsOpen, setPastEventsOpen] = useState(false);
  const [pastSpecialsOpen, setPastSpecialsOpen] = useState(false);

  const fetchPendingVenues = useCallback(async () => {
    setLoadingVenues(true);
    try {
      const res = await fetch('/api/venues?status=pending');
      if (res.ok) {
        const data = await res.json();
        setPendingVenues(data.venues || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending venues:', error);
    } finally {
      setLoadingVenues(false);
    }
  }, []);

  const fetchPublishedVenues = useCallback(async () => {
    try {
      const res = await fetch('/api/venues?status=approved');
      if (res.ok) {
        const data = await res.json();
        setPublishedVenues(data.venues || []);
      }
    } catch (error) {
      console.error('Failed to fetch published venues:', error);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/login');
    }
  }, [isAdmin, authLoading, router]);

  // Refresh pending events and venues when admin loads the page
  useEffect(() => {
    if (isAdmin) {
      refreshPendingEvents();
      fetchPendingVenues();
      fetchPublishedVenues();
    }
  }, [isAdmin, refreshPendingEvents, fetchPendingVenues, fetchPublishedVenues]);

  // Group pending events by seriesId (one card per series or standalone event)
  // NOTE: This must be before any early returns to comply with Rules of Hooks
  const groupedPendingEvents = useMemo(() => {
    const seriesMap = new Map<string, typeof pendingEvents>();
    const standalone: typeof pendingEvents = [];

    for (const event of pendingEvents) {
      if (event.seriesId) {
        const list = seriesMap.get(event.seriesId) || [];
        list.push(event);
        seriesMap.set(event.seriesId, list);
      } else {
        standalone.push(event);
      }
    }

    const groups = [];
    for (const [, instances] of seriesMap) {
      instances.sort((a, b) => a.date.localeCompare(b.date));
      const representative = instances[0];
      groups.push({
        ...representative,
        totalInstances: instances.length,
      });
    }

    for (const event of standalone) {
      groups.push({
        ...event,
        totalInstances: 1,
      });
    }

    return groups;
  }, [pendingEvents]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const upcomingPublishedEvents = useMemo(() => {
    const filtered = events.filter(
      (event) =>
        !event.categories.includes('food-deal') &&
        event.status === 'approved' &&
        event.date >= todayStr &&
        matchesSearch(event, publishedEventsSearch)
    );
    return sortEvents(filtered, publishedEventsSort);
  }, [events, todayStr, publishedEventsSearch, publishedEventsSort]);

  const upcomingPublishedSpecials = useMemo(() => {
    const filtered = events.filter(
      (event) =>
        event.categories.includes('food-deal') &&
        event.status === 'approved' &&
        event.date >= todayStr &&
        matchesSearch(event, publishedSpecialsSearch)
    );
    return sortEvents(filtered, publishedSpecialsSort);
  }, [events, todayStr, publishedSpecialsSearch, publishedSpecialsSort]);

  const pastPublishedEvents = useMemo(() => {
    const filtered = events.filter(
      (event) =>
        !event.categories.includes('food-deal') &&
        event.status === 'approved' &&
        event.date < todayStr &&
        matchesSearch(event, pastEventsSearch)
    );
    return sortEvents(filtered, pastEventsSort);
  }, [events, todayStr, pastEventsSearch, pastEventsSort]);

  const pastPublishedSpecials = useMemo(() => {
    const filtered = events.filter(
      (event) =>
        event.categories.includes('food-deal') &&
        event.status === 'approved' &&
        event.date < todayStr &&
        matchesSearch(event, pastSpecialsSearch)
    );
    return sortEvents(filtered, pastSpecialsSort);
  }, [events, todayStr, pastSpecialsSearch, pastSpecialsSort]);

  if (authLoading || eventsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const closeModal = () => setModal(initialModalState);
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ isVisible: true, message, type });
  };

  // Double-click to approve: first click shows confirmation state, second click approves
  // eventId here is seriesId for recurring series, or the event id for standalones
  const handleApproveClick = async (eventId: string, isRecurringSeries?: boolean) => {
    if (clickedApproveId === eventId) {
      // Second click - actually approve
      setProcessingEventId(eventId);
      setClickedApproveId(null);
      
      // If this is a recurring series, approve all related events
      if (isRecurringSeries) {
        try {
          const res = await fetch(`/api/events/approve-recurring/${eventId}`, { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            showToast(`Approved ${data.count} recurring events`, 'success');
            await refreshPendingEvents();
            await refreshEvents();
          }
        } catch (error) {
          showToast('Failed to approve events', 'error');
        }
      } else {
        await approveEvent(eventId);
        showToast('Event approved', 'success');
      }
      setProcessingEventId(null);
    } else {
      // First click - show confirmation state
      setClickedApproveId(eventId);
      setClickedRejectId(null);
      // Reset after 3 seconds if not clicked again
      setTimeout(() => setClickedApproveId(prev => prev === eventId ? null : prev), 3000);
    }
  };

  // Double-click to reject
  const handleRejectClick = async (eventId: string, isRecurringSeries?: boolean) => {
    if (clickedRejectId === eventId) {
      // Second click - show modal for destructive action
      setModal({
        isOpen: true,
        title: 'Reject Event',
        message: isRecurringSeries 
          ? 'This will reject ALL instances of this recurring event. This action cannot be undone.'
          : 'This event will be permanently deleted. This action cannot be undone.',
        type: 'warning',
        confirmText: 'Reject',
        onConfirm: async () => {
          setProcessingEventId(eventId);
          if (isRecurringSeries) {
            try {
              const res = await fetch(`/api/events/reject-recurring/${eventId}`, { method: 'POST' });
              if (res.ok) {
                const data = await res.json();
                showToast(`Rejected ${data.count} recurring events`, 'info');
                await refreshPendingEvents();
              }
            } catch (error) {
              showToast('Failed to reject events', 'error');
            }
          } else {
            await rejectEvent(eventId);
            showToast('Event rejected', 'info');
          }
          setProcessingEventId(null);
        },
      });
      setClickedRejectId(null);
    } else {
      // First click - show confirmation state
      setClickedRejectId(eventId);
      setClickedApproveId(null);
      setTimeout(() => setClickedRejectId(prev => prev === eventId ? null : prev), 3000);
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    setModal({
      isOpen: true,
      title: 'Cancel Event',
      message: 'This event will be marked as cancelled but not deleted. Users will see it as cancelled.',
      type: 'warning',
      confirmText: 'Cancel Event',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/events/${eventId}/cancel`, { method: 'POST' });
          if (res.ok) {
            showToast('Event marked as cancelled', 'success');
            await refreshEvents();
          }
        } catch (error) {
          showToast('Failed to cancel event', 'error');
        }
      },
    });
  };

  const deleteEventByScope = async (eventId: string, scope: 'this' | 'future') => {
    setDeletingEventId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}?scope=${scope}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(scope === 'future' ? 'Deleted this and future occurrences' : 'Event deleted', 'success');
        await refreshEvents();
        await refreshPendingEvents();
      } else {
        showToast('Failed to delete event', 'error');
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      showToast('Failed to delete event', 'error');
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleDeleteEvent = (event: {
    id: string;
    seriesId?: string;
    isRecurring?: boolean;
    categories: string[];
  }) => {
    const isSpecial = event.categories.includes('food-deal');
    const title = isSpecial ? 'Delete Food & Drink Special' : 'Delete Event';
    const isRecurring = Boolean(event.isRecurring && event.seriesId);

    if (isRecurring) {
      setModal({
        isOpen: true,
        title,
        message: 'Choose what to delete. This action cannot be undone.',
        type: 'warning',
        confirmText: 'This occurrence',
        onConfirm: () => {
          void deleteEventByScope(event.id, 'this');
        },
        secondaryConfirmText: 'This & all future',
        onSecondaryConfirm: () => {
          void deleteEventByScope(event.id, 'future');
        },
      });
      return;
    }

    setModal({
      isOpen: true,
      title,
      message: isSpecial
        ? 'This special will be permanently deleted. This action cannot be undone.'
        : 'This event will be permanently deleted. This action cannot be undone.',
      type: 'warning',
      confirmText: 'Delete',
      onConfirm: () => {
        void deleteEventByScope(event.id, 'this');
      },
    });
  };

  const handleApproveVenue = (venueId: string) => {
    setModal({
      isOpen: true,
      title: 'Approve Venue',
      message: 'This venue will be available for event submissions. Are you sure you want to approve it?',
      type: 'confirm',
      confirmText: 'Approve',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/venues/${venueId}/approve`, { method: 'POST' });
          if (res.ok) {
            await fetchPendingVenues();
            await fetchPublishedVenues();
          }
        } catch (error) {
          console.error('Failed to approve venue:', error);
        }
      },
    });
  };

  const handleRejectVenue = (venueId: string) => {
    setModal({
      isOpen: true,
      title: 'Reject Venue',
      message: 'This venue will be permanently deleted. This action cannot be undone.',
      type: 'warning',
      confirmText: 'Reject',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/venues/${venueId}/reject`, { method: 'POST' });
          if (res.ok) {
            await fetchPendingVenues();
          }
        } catch (error) {
          console.error('Failed to reject venue:', error);
        }
      },
    });
  };

  const handleDeleteVenue = (venueId: string) => {
    setModal({
      isOpen: true,
      title: 'Delete Venue',
      message: 'This venue will be permanently deleted. This action cannot be undone.',
      type: 'warning',
      confirmText: 'Delete',
      onConfirm: async () => {
        setDeletingVenueId(venueId);
        try {
          const res = await fetch(`/api/venues/${venueId}`, { method: 'DELETE' });
          if (res.ok) {
            showToast('Venue deleted successfully', 'success');
            await fetchPublishedVenues();
            await fetchPendingVenues();
          } else {
            showToast('Failed to delete venue', 'error');
          }
        } catch (error) {
          console.error('Failed to delete venue:', error);
          showToast('Failed to delete venue', 'error');
        } finally {
          setDeletingVenueId(null);
        }
      },
    });
  };

  const handleEditVenue = (venue: PublishedVenue) => {
    setEditingVenue(venue);
  };

  const handleSaveVenue = async (venueData: PublishedVenue) => {
    try {
      const requestBody: {
        name: string;
        address: string;
        neighborhood?: string;
        website?: string;
        imageUrl?: string;
        coverImageUrl?: string;
        promotionTier: string;
      } = {
        name: venueData.name,
        address: venueData.address,
        promotionTier: venueData.promotionTier || 'standard',
      };
      
      // Only include optional fields if they have actual string values (not null/undefined/empty)
      // This preserves existing values in the database for fields we don't include
      if (venueData.neighborhood && typeof venueData.neighborhood === 'string') {
        requestBody.neighborhood = venueData.neighborhood;
      }
      if (venueData.website && typeof venueData.website === 'string') {
        requestBody.website = venueData.website;
      }
      // Include imageUrl if it exists (including data URLs from file uploads)
      if (venueData.imageUrl && typeof venueData.imageUrl === 'string') {
        requestBody.imageUrl = venueData.imageUrl;
      }
      if (venueData.coverImageUrl && typeof venueData.coverImageUrl === 'string') {
        requestBody.coverImageUrl = venueData.coverImageUrl;
      }
      
      console.log('Updating venue with data:', requestBody);
      
      const res = await fetch(`/api/venues/${venueData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (res.ok) {
        showToast('Venue updated successfully', 'success');
        setEditingVenue(null);
        await fetchPublishedVenues();
        // Refresh venues in EventsContext so venue tab shows updated image
        await refreshVenues();
      } else {
        let errorMessage = 'Unknown error';
        try {
          const text = await res.text();
          console.error('API response status:', res.status, res.statusText);
          console.error('API response body:', text);
          
          if (text) {
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.error || errorData.message || errorData.details || JSON.stringify(errorData);
            } catch {
              errorMessage = text || `HTTP ${res.status}: ${res.statusText}`;
            }
          } else {
            errorMessage = `HTTP ${res.status}: ${res.statusText}`;
          }
        } catch (parseError) {
          errorMessage = `HTTP ${res.status}: ${res.statusText}`;
          console.error('Failed to parse error response:', parseError);
        }
        showToast(`Failed to update venue: ${errorMessage}`, 'error');
      }
    } catch (error) {
      console.error('Failed to update venue:', error);
      showToast(`Failed to update venue: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-red-900 to-red-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={32} />
            <h1 className="font-display text-4xl">Admin Dashboard</h1>
          </div>
          <p className="text-white/80">
            Manage events, venues, approve submissions, and monitor the platform.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{groupedPendingEvents.length}</p>
                <p className="text-sm text-muted-foreground">Pending Events</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Building size={24} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{pendingVenues.length}</p>
                <p className="text-sm text-muted-foreground">Pending Venues</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <FileText size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{events.length}</p>
                <p className="text-sm text-muted-foreground">Published Events</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">—</p>
                <p className="text-sm text-muted-foreground">Registered Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          <button
            onClick={() => setActiveSubTab('pending-published')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeSubTab === 'pending-published'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending & Published
            {(groupedPendingEvents.length > 0 || pendingVenues.length > 0) && (
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-500 text-white">
                {groupedPendingEvents.length + pendingVenues.length}
              </span>
            )}
            {activeSubTab === 'pending-published' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('venue-promotions')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeSubTab === 'venue-promotions'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Venue Promotions
            {activeSubTab === 'venue-promotions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeSubTab === 'pending-published' && (
          <>
            {/* Pending Events */}
            <section className="mb-12">
              <h2 className="font-display text-2xl text-foreground mb-6 flex items-center gap-2">
                <AlertTriangle size={24} className="text-orange-500" />
                Pending Event Submissions
              </h2>

              {groupedPendingEvents.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <Check size={48} className="mx-auto text-green-500 mb-4" />
                  <h3 className="font-display text-xl text-foreground mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">No events pending approval.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedPendingEvents.map((event) => (
                    <div
                      key={event.seriesId || event.id}
                      className="bg-card border border-border rounded-xl overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                          {/* Event Image */}
                          <div className="relative w-full lg:w-48 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {event.imageUrl ? (
                              <SmartImage
                                src={event.imageUrl}
                                alt={event.title}
                                sizes="(max-width: 1024px) 100vw, 192px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                                <Calendar size={32} className="text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Event Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-2 mb-2">
                              {event.categories.map((cat) => (
                                <span
                                  key={cat}
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${categoryColors[cat as EventCategory]}`}
                                >
                                  {categoryLabels[cat as EventCategory]}
                                </span>
                              ))}
                            </div>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-display text-xl text-foreground">
                                {event.title}
                              </h3>
                              {(event.seriesId && event.totalInstances > 1) && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                  <Repeat size={12} />
                                  {event.totalInstances} instances
                                </span>
                              )}
                            </div>
                            
                            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                              {event.description}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {format(parseISO(event.date), 'EEE, MMM d, yyyy')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {format(parseISO(`2000-01-01T${event.startTime}`), 'h:mm a')}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin size={14} />
                                {event.venue.name}
                              </span>
                            </div>
                            
                            {(event.submitterName || event.submitterRole) && (
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Users size={14} />
                                  Submitted by:
                                </span>
                                <span className="font-medium text-foreground">
                                  {event.submitterName || 'Unknown User'}
                                </span>
                                {event.submitterRole && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground capitalize">
                                    {event.submitterRole}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {event.price && (
                              <p className="mt-2 text-sm font-medium text-primary">
                                {event.price}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex lg:flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                const isSeriesBatch = Boolean(event.seriesId && event.totalInstances > 1);
                                handleApproveClick(
                                  isSeriesBatch ? (event.seriesId as string) : event.id,
                                  isSeriesBatch
                                );
                              }}
                              disabled={processingEventId === (event.seriesId && event.totalInstances > 1 ? event.seriesId : event.id)}
                              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                clickedApproveId === (event.seriesId && event.totalInstances > 1 ? event.seriesId : event.id)
                                  ? 'bg-green-700 text-white ring-2 ring-green-400'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              } disabled:opacity-50`}
                            >
                              {processingEventId === (event.seriesId && event.totalInstances > 1 ? event.seriesId : event.id) ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Check size={18} />
                              )}
                              {clickedApproveId === (event.seriesId && event.totalInstances > 1 ? event.seriesId : event.id)
                                ? 'Click to confirm'
                                : (event.seriesId && event.totalInstances > 1 ? `Approve All (${event.totalInstances})` : 'Approve')}
                            </button>
                            <button
                              onClick={() => {
                                const isSeriesBatch = Boolean(event.seriesId && event.totalInstances > 1);
                                handleRejectClick(
                                  isSeriesBatch ? (event.seriesId as string) : event.id,
                                  isSeriesBatch
                                );
                              }}
                              disabled={processingEventId === (event.seriesId && event.totalInstances > 1 ? event.seriesId : event.id)}
                              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                clickedRejectId === (event.seriesId && event.totalInstances > 1 ? event.seriesId : event.id)
                                  ? 'bg-red-700 text-white ring-2 ring-red-400'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                              } disabled:opacity-50`}
                            >
                              <X size={18} />
                              {clickedRejectId === (event.seriesId && event.totalInstances > 1 ? event.seriesId : event.id)
                                ? 'Click to confirm'
                                : (event.seriesId && event.totalInstances > 1 ? `Reject All (${event.totalInstances})` : 'Reject')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Pending Venues */}
            {pendingVenues.length > 0 && (
          <section className="mb-12">
            <h2 className="font-display text-2xl text-foreground mb-6 flex items-center gap-2">
              <Building size={24} className="text-amber-500" />
              Pending Venue Submissions
            </h2>

            <div className="space-y-4">
              {pendingVenues.map((venue) => (
                <div
                  key={venue.id}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display text-lg text-foreground mb-1">
                        {venue.name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin size={14} />
                        {venue.address}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveVenue(venue.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check size={18} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectVenue(venue.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <X size={18} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </section>
            )}

            {/* Published Events and Specials in Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Published Events Column */}
              <section>
                <h2 className="font-display text-2xl text-foreground mb-4 flex items-center gap-2">
                  <FileText size={24} className="text-green-500" />
                  Published Events
                </h2>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      value={publishedEventsSearch}
                      onChange={(e) => {
                        setPublishedEventsSearch(e.target.value);
                        setPublishedEventsPage(1);
                      }}
                      placeholder="Search title or venue..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground mr-1">Sort:</span>
                    <button
                      type="button"
                      onClick={() => { setPublishedEventsSort('date'); setPublishedEventsPage(1); }}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${publishedEventsSort === 'date' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
                    >
                      Date
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPublishedEventsSort('venue'); setPublishedEventsPage(1); }}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${publishedEventsSort === 'venue' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
                    >
                      Venue
                    </button>
                  </div>
                </div>

                {upcomingPublishedEvents.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl p-8 text-center">
                    <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display text-xl text-foreground mb-2">No Upcoming Events</h3>
                    <p className="text-muted-foreground">Approved upcoming events will appear here.</p>
                  </div>
                ) : (() => {
                  const totalPages = Math.ceil(upcomingPublishedEvents.length / itemsPerPage);
                  const startIndex = (publishedEventsPage - 1) * itemsPerPage;
                  const paginatedEvents = upcomingPublishedEvents.slice(startIndex, startIndex + itemsPerPage);

                  return (
                    <>
                      <div className="space-y-3">
                        {paginatedEvents.map((event) => (
                          <div
                            key={event.id}
                            className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                {event.imageUrl ? (
                                  <SmartImage
                                    src={event.imageUrl}
                                    alt={event.title}
                                    sizes="64px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                                    <Calendar size={16} className="text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-medium text-foreground truncate">{event.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {format(parseISO(event.date), 'MMM d, yyyy')} • {event.venue.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Link
                                href={`/events/${event.id}`}
                                className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              >
                                View
                              </Link>
                              <button
                                onClick={() => handleCancelEvent(event.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <Ban size={14} />
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(event)}
                                disabled={deletingEventId === event.id}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {deletingEventId === event.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <button
                            onClick={() => setPublishedEventsPage(prev => Math.max(1, prev - 1))}
                            disabled={publishedEventsPage === 1}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft size={16} />
                            Previous
                          </button>
                          <span className="text-sm text-muted-foreground">
                            Page {publishedEventsPage} of {totalPages} ({upcomingPublishedEvents.length} total)
                          </span>
                          <button
                            onClick={() => setPublishedEventsPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={publishedEventsPage === totalPages}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </section>

              {/* Published Food & Drink Specials Column */}
              <section>
                <h2 className="font-display text-2xl text-foreground mb-4 flex items-center gap-2">
                  <Utensils size={24} className="text-green-500" />
                  Published Food & Drink Specials
                </h2>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      value={publishedSpecialsSearch}
                      onChange={(e) => {
                        setPublishedSpecialsSearch(e.target.value);
                        setPublishedSpecialsPage(1);
                      }}
                      placeholder="Search title or venue..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground mr-1">Sort:</span>
                    <button
                      type="button"
                      onClick={() => { setPublishedSpecialsSort('date'); setPublishedSpecialsPage(1); }}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${publishedSpecialsSort === 'date' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
                    >
                      Date
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPublishedSpecialsSort('venue'); setPublishedSpecialsPage(1); }}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${publishedSpecialsSort === 'venue' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
                    >
                      Venue
                    </button>
                  </div>
                </div>

                {upcomingPublishedSpecials.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl p-8 text-center">
                    <Utensils size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display text-xl text-foreground mb-2">No Upcoming Specials</h3>
                    <p className="text-muted-foreground">Approved upcoming specials will appear here.</p>
                  </div>
                ) : (() => {
                  const totalPages = Math.ceil(upcomingPublishedSpecials.length / itemsPerPage);
                  const startIndex = (publishedSpecialsPage - 1) * itemsPerPage;
                  const paginatedSpecials = upcomingPublishedSpecials.slice(startIndex, startIndex + itemsPerPage);

                  return (
                    <>
                      <div className="space-y-3">
                        {paginatedSpecials.map((special) => (
                          <div
                            key={special.id}
                            className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-16 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                                  <Utensils size={16} className="text-muted-foreground" />
                                </div>
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-medium text-foreground truncate">{special.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {format(parseISO(special.date), 'MMM d, yyyy')} • {special.venue.name}
                                  {special.price && ` • ${formatPrice(special.price)}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Link
                                href={`/events/${special.id}`}
                                className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              >
                                View
                              </Link>
                              <button
                                onClick={() => handleDeleteEvent(special)}
                                disabled={deletingEventId === special.id}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {deletingEventId === special.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <button
                            onClick={() => setPublishedSpecialsPage(prev => Math.max(1, prev - 1))}
                            disabled={publishedSpecialsPage === 1}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft size={16} />
                            Previous
                          </button>
                          <span className="text-sm text-muted-foreground">
                            Page {publishedSpecialsPage} of {totalPages} ({upcomingPublishedSpecials.length} total)
                          </span>
                          <button
                            onClick={() => setPublishedSpecialsPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={publishedSpecialsPage === totalPages}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </section>
            </div>

            {/* Past Events and Specials */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <section>
                <button
                  type="button"
                  onClick={() => setPastEventsOpen((open) => !open)}
                  className="w-full flex items-center justify-between mb-4 text-left"
                >
                  <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
                    <FileText size={24} className="text-muted-foreground" />
                    Past Events
                    <span className="text-sm font-sans font-normal text-muted-foreground">
                      ({pastPublishedEvents.length})
                    </span>
                  </h2>
                  {pastEventsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {pastEventsOpen && (
                  <>
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="search"
                          value={pastEventsSearch}
                          onChange={(e) => {
                            setPastEventsSearch(e.target.value);
                            setPastEventsPage(1);
                          }}
                          placeholder="Search title or venue..."
                          className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground mr-1">Sort:</span>
                        <button
                          type="button"
                          onClick={() => { setPastEventsSort('date'); setPastEventsPage(1); }}
                          className={`px-3 py-1.5 rounded-lg transition-colors ${pastEventsSort === 'date' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
                        >
                          Date
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPastEventsSort('venue'); setPastEventsPage(1); }}
                          className={`px-3 py-1.5 rounded-lg transition-colors ${pastEventsSort === 'venue' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
                        >
                          Venue
                        </button>
                      </div>
                    </div>
                    {pastPublishedEvents.length === 0 ? (
                      <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
                        No past events.
                      </div>
                    ) : (() => {
                      const totalPages = Math.ceil(pastPublishedEvents.length / itemsPerPage);
                      const startIndex = (pastEventsPage - 1) * itemsPerPage;
                      const pageItems = pastPublishedEvents.slice(startIndex, startIndex + itemsPerPage);
                      return (
                        <>
                          <div className="space-y-3">
                            {pageItems.map((event) => (
                              <div
                                key={event.id}
                                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4"
                              >
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-foreground truncate">{event.title}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {format(parseISO(event.date), 'MMM d, yyyy')} • {event.venue.name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Link
                                    href={`/events/${event.id}`}
                                    className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  >
                                    View
                                  </Link>
                                  <button
                                    onClick={() => handleDeleteEvent(event)}
                                    disabled={deletingEventId === event.id}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {deletingEventId === event.id ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-border">
                              <button
                                onClick={() => setPastEventsPage((p) => Math.max(1, p - 1))}
                                disabled={pastEventsPage === 1}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ChevronLeft size={16} />
                                Previous
                              </button>
                              <span className="text-sm text-muted-foreground">
                                Page {pastEventsPage} of {totalPages}
                              </span>
                              <button
                                onClick={() => setPastEventsPage((p) => Math.min(totalPages, p + 1))}
                                disabled={pastEventsPage === totalPages}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </section>

              <section>
                <button
                  type="button"
                  onClick={() => setPastSpecialsOpen((open) => !open)}
                  className="w-full flex items-center justify-between mb-4 text-left"
                >
                  <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
                    <Utensils size={24} className="text-muted-foreground" />
                    Past Specials
                    <span className="text-sm font-sans font-normal text-muted-foreground">
                      ({pastPublishedSpecials.length})
                    </span>
                  </h2>
                  {pastSpecialsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {pastSpecialsOpen && (
                  <>
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="search"
                          value={pastSpecialsSearch}
                          onChange={(e) => {
                            setPastSpecialsSearch(e.target.value);
                            setPastSpecialsPage(1);
                          }}
                          placeholder="Search title or venue..."
                          className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground mr-1">Sort:</span>
                        <button
                          type="button"
                          onClick={() => { setPastSpecialsSort('date'); setPastSpecialsPage(1); }}
                          className={`px-3 py-1.5 rounded-lg transition-colors ${pastSpecialsSort === 'date' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
                        >
                          Date
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPastSpecialsSort('venue'); setPastSpecialsPage(1); }}
                          className={`px-3 py-1.5 rounded-lg transition-colors ${pastSpecialsSort === 'venue' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
                        >
                          Venue
                        </button>
                      </div>
                    </div>
                    {pastPublishedSpecials.length === 0 ? (
                      <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
                        No past specials.
                      </div>
                    ) : (() => {
                      const totalPages = Math.ceil(pastPublishedSpecials.length / itemsPerPage);
                      const startIndex = (pastSpecialsPage - 1) * itemsPerPage;
                      const pageItems = pastPublishedSpecials.slice(startIndex, startIndex + itemsPerPage);
                      return (
                        <>
                          <div className="space-y-3">
                            {pageItems.map((special) => (
                              <div
                                key={special.id}
                                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4"
                              >
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-foreground truncate">{special.title}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {format(parseISO(special.date), 'MMM d, yyyy')} • {special.venue.name}
                                    {special.price && ` • ${formatPrice(special.price)}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Link
                                    href={`/events/${special.id}`}
                                    className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  >
                                    View
                                  </Link>
                                  <button
                                    onClick={() => handleDeleteEvent(special)}
                                    disabled={deletingEventId === special.id}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {deletingEventId === special.id ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-border">
                              <button
                                onClick={() => setPastSpecialsPage((p) => Math.max(1, p - 1))}
                                disabled={pastSpecialsPage === 1}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ChevronLeft size={16} />
                                Previous
                              </button>
                              <span className="text-sm text-muted-foreground">
                                Page {pastSpecialsPage} of {totalPages}
                              </span>
                              <button
                                onClick={() => setPastSpecialsPage((p) => Math.min(totalPages, p + 1))}
                                disabled={pastSpecialsPage === totalPages}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </section>
            </div>

            {/* Published Venues */}
        <section className="mb-12">
          <h2 className="font-display text-2xl text-foreground mb-6 flex items-center gap-2">
            <Building size={24} className="text-green-500" />
            Published Venues
          </h2>

          {publishedVenues.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Building size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">No Published Venues</h3>
              <p className="text-muted-foreground">Venues will appear here once approved.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {publishedVenues.map((venue) => (
                <div
                  key={venue.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {venue.imageUrl ? (
                        <SmartImage
                          src={venue.imageUrl}
                          alt={venue.name}
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                          <Building size={16} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground truncate">{venue.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin size={12} />
                        {venue.address}
                        {venue.eventCount !== undefined && (
                          <span className="ml-2">• {venue.eventCount} event{venue.eventCount !== 1 ? 's' : ''}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/venues/${venue.id}`}
                      className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleEditVenue(venue)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVenue(venue.id)}
                      disabled={deletingVenueId === venue.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingVenueId === venue.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              </div>
            )}
          </section>
          </>
        )}

        {activeSubTab === 'venue-promotions' && (
          <section className="mb-12">
            <h2 className="font-display text-2xl text-foreground mb-6 flex items-center gap-2">
              <Building size={24} className="text-green-500" />
              Published Venues
            </h2>

            {publishedVenues.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Building size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="font-display text-xl text-foreground mb-2">No Published Venues</h3>
                <p className="text-muted-foreground">Venues will appear here once approved.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {publishedVenues.map((venue) => (
                  <div
                    key={venue.id}
                    className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {venue.imageUrl ? (
                          <SmartImage
                            src={venue.imageUrl}
                            alt={venue.name}
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                            <Building size={16} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground truncate">{venue.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin size={12} />
                          {venue.address}
                          {venue.eventCount !== undefined && (
                            <span className="ml-2">• {venue.eventCount} event{venue.eventCount !== 1 ? 's' : ''}</span>
                          )}
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                            (venue.promotionTier || 'standard') === 'featured' ? 'bg-yellow-100 text-yellow-800' :
                            (venue.promotionTier || 'standard') === 'promoted' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {(venue.promotionTier || 'standard') === 'featured' ? 'Featured' :
                             (venue.promotionTier || 'standard') === 'promoted' ? 'Promoted' : 'Standard'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/venues/${venue.id}`}
                        className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleEditVenue(venue)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteVenue(venue.id)}
                        disabled={deletingVenueId === venue.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingVenueId === venue.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Quick Links */}
        <section>
          <h2 className="font-display text-2xl text-foreground mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/events"
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <FileText size={24} className="text-primary mb-3" />
              <h3 className="font-medium text-foreground mb-1">View All Events</h3>
              <p className="text-sm text-muted-foreground">Browse and manage published events</p>
            </Link>
            <Link
              href="/venues"
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <MapPin size={24} className="text-primary mb-3" />
              <h3 className="font-medium text-foreground mb-1">Manage Venues</h3>
              <p className="text-sm text-muted-foreground">View and edit venue listings</p>
            </Link>
            <Link
              href="/submit"
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <Calendar size={24} className="text-primary mb-3" />
              <h3 className="font-medium text-foreground mb-1">Add Event</h3>
              <p className="text-sm text-muted-foreground">Create a new event directly</p>
            </Link>
          </div>
        </section>
      </div>

      {/* Edit Venue Modal */}
      {editingVenue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl text-foreground">Edit Venue</h2>
              <button
                onClick={() => setEditingVenue(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={24} />
              </button>
            </div>
            <EditVenueForm
              venue={editingVenue}
              onSave={handleSaveVenue}
              onCancel={() => setEditingVenue(null)}
            />
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        confirmText={modal.confirmText}
        onConfirm={modal.onConfirm}
        secondaryConfirmText={modal.secondaryConfirmText}
        onSecondaryConfirm={modal.onSecondaryConfirm}
      />

      {/* Toast notifications */}
      <Toast
        isOpen={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
