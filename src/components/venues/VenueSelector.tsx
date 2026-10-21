'use client';

import { useState, useRef, useEffect } from 'react';
import type { Venue } from '@/types/event';
import { MapPin, X, Plus, ChevronDown, Search, Check } from 'lucide-react';

interface VenueSelectorProps {
  venues: Venue[];
  selectedVenueId: string;
  newVenueName: string;
  newVenueAddress: string;
  onVenueSelect: (venueId: string) => void;
  onNewVenueNameChange: (name: string) => void;
  onNewVenueAddressChange: (address: string) => void;
  /** Downtown Kingston District checkbox, shown only while adding a new venue */
  newVenueIsDowntown?: boolean;
  onNewVenueIsDowntownChange?: (value: boolean) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

export default function VenueSelector({
  venues,
  selectedVenueId,
  newVenueName,
  newVenueAddress,
  onVenueSelect,
  onNewVenueNameChange,
  onNewVenueAddressChange,
  newVenueIsDowntown = false,
  onNewVenueIsDowntownChange,
  label = 'Select a Venue',
  placeholder = 'Type to search venues...',
  required = false,
  id,
}: VenueSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showNewVenueFields, setShowNewVenueFields] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedVenue = venues.find(v => v.id === selectedVenueId);

  const filteredVenues = venues.filter(venue =>
    venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const shouldShowNewVenue = searchQuery.trim() !== '' && 
    !filteredVenues.some(v => v.name.toLowerCase() === searchQuery.toLowerCase().trim()) &&
    (showNewVenueFields || selectedVenueId === 'new');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedVenueId && selectedVenueId !== 'new') {
      setSearchQuery('');
      setShowNewVenueFields(false);
    }
  }, [selectedVenueId]);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setIsOpen(true);
    
    if (value.trim() !== '' && !filteredVenues.some(v => v.name.toLowerCase() === value.toLowerCase().trim())) {
      setShowNewVenueFields(false);
    }
  };

  const handleVenueSelect = (venueId: string) => {
    onVenueSelect(venueId);
    setIsOpen(false);
    setSearchQuery('');
    setShowNewVenueFields(false);
  };

  const handleCreateNewVenue = () => {
    onVenueSelect('new');
    setShowNewVenueFields(true);
    setIsOpen(false);
    if (searchQuery.trim() && !newVenueName) {
      onNewVenueNameChange(searchQuery.trim());
    }
  };

  const handleClearSelection = () => {
    onVenueSelect('');
    setSearchQuery('');
    setShowNewVenueFields(false);
    setIsOpen(false);
    onNewVenueNameChange('');
    onNewVenueAddressChange('');
    onNewVenueIsDowntownChange?.(false);
  };

  const displayValue = selectedVenue
    ? `${selectedVenue.name}${selectedVenue.neighborhood ? ` - ${selectedVenue.neighborhood}` : ''}`
    : searchQuery;

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative">
        <label htmlFor={id} className="field-label">
          {label} {required && '*'}
        </label>
        
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-link pointer-events-none z-10" />
          <input
            ref={inputRef}
            type="text"
            id={id}
            value={displayValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`field pl-10 pr-10 ${
              required && !selectedVenueId && !showNewVenueFields ? 'border-red-300' : ''
            }`}
          />
          {selectedVenueId && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          )}
          {!selectedVenueId && (
            <ChevronDown 
              size={16} 
              className={`absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          )}
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-line rounded-[14px] shadow-lg max-h-64 overflow-y-auto">
            {filteredVenues.length > 0 ? (
              <>
                {filteredVenues.map((venue) => (
                  <button
                    key={venue.id}
                    type="button"
                    onClick={() => handleVenueSelect(venue.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-muted transition-colors ${
                      selectedVenueId === venue.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="font-medium text-foreground">{venue.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {venue.address}
                      {venue.neighborhood && ` • ${venue.neighborhood}`}
                    </div>
                  </button>
                ))}
                
                {searchQuery.trim() !== '' && 
                 !filteredVenues.some(v => v.name.toLowerCase() === searchQuery.toLowerCase().trim()) && (
                  <div className="border-t border-border">
                    <button
                      type="button"
                      onClick={handleCreateNewVenue}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-2 text-primary"
                    >
                      <Plus size={16} />
                      <span>Create new venue: &quot;{searchQuery.trim()}&quot;</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery.trim() === '' ? (
                  'Type to search venues...'
                ) : (
                  <div>
                    <p className="mb-3">No venues found matching &quot;{searchQuery}&quot;</p>
                    <button
                      type="button"
                      onClick={handleCreateNewVenue}
                      className="btn-navy btn-sm mx-auto"
                    >
                      <Plus size={16} />
                      Create new venue: &quot;{searchQuery.trim()}&quot;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showNewVenueFields || selectedVenueId === 'new' ? (
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="bg-[#fff1d6] rounded-[12px] p-3 flex items-start gap-2">
            <MapPin size={16} className="text-[#8a5a00] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#8a5a00]">
              New venues require admin approval before they appear in the venue list. Please provide the complete address.
            </p>
          </div>
          <div>
            <label htmlFor={`${id}-new-name`} className="field-label">
              Venue Name {required && '*'}
            </label>
            <input
              type="text"
              id={`${id}-new-name`}
              value={newVenueName}
              onChange={(e) => onNewVenueNameChange(e.target.value)}
              placeholder="e.g., The Ale House"
              required={required && (selectedVenueId === 'new' || showNewVenueFields)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor={`${id}-new-address`} className="field-label">
              Address {required && '*'}
            </label>
            <input
              type="text"
              id={`${id}-new-address`}
              value={newVenueAddress}
              onChange={(e) => onNewVenueAddressChange(e.target.value)}
              placeholder="e.g., 393 Princess St, Kingston, ON"
              required={required && (selectedVenueId === 'new' || showNewVenueFields)}
              className="field"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Please provide the complete street address including city and province
            </p>
          </div>
          {onNewVenueIsDowntownChange && (
            <button
              type="button"
              role="checkbox"
              aria-checked={newVenueIsDowntown}
              onClick={() => onNewVenueIsDowntownChange(!newVenueIsDowntown)}
              className="flex items-center gap-3 text-left text-[14px] text-navy"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-colors ${
                  newVenueIsDowntown ? 'border-navy bg-navy text-white' : 'border-line bg-white'
                }`}
              >
                {newVenueIsDowntown && <Check size={13} strokeWidth={3} />}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/dk-badge.svg" alt="Downtown Kingston" width={24} height={24} className="shrink-0" />
              This venue is part of the Downtown Kingston District
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

