'use client';

import { useState, useRef, useEffect } from 'react';
import type { Venue } from '@/types/event';
import { MapPin, X, Plus, ChevronDown, Search } from 'lucide-react';

interface VenueSelectorProps {
  venues: Venue[];
  selectedVenueId: string;
  newVenueName: string;
  newVenueAddress: string;
  onVenueSelect: (venueId: string) => void;
  onNewVenueNameChange: (name: string) => void;
  onNewVenueAddressChange: (address: string) => void;
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
  };

  const displayValue = selectedVenue
    ? `${selectedVenue.name}${selectedVenue.neighborhood ? ` - ${selectedVenue.neighborhood}` : ''}`
    : searchQuery;

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative">
        <label htmlFor={id} className="block text-sm font-medium text-foreground mb-2">
          Select a Venue {required && '*'}
        </label>
        
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
          <input
            ref={inputRef}
            type="text"
            id={id}
            value={displayValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Type to search venues..."
            className={`w-full pl-10 pr-10 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${
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
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
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
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <MapPin size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              New venues require admin approval before they appear in the venue list. Please provide the complete address.
            </p>
          </div>
          <div>
            <label htmlFor={`${id}-new-name`} className="block text-sm font-medium text-foreground mb-2">
              Venue Name {required && '*'}
            </label>
            <input
              type="text"
              id={`${id}-new-name`}
              value={newVenueName}
              onChange={(e) => onNewVenueNameChange(e.target.value)}
              placeholder="e.g., The Ale House"
              required={required && (selectedVenueId === 'new' || showNewVenueFields)}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor={`${id}-new-address`} className="block text-sm font-medium text-foreground mb-2">
              Address {required && '*'}
            </label>
            <input
              type="text"
              id={`${id}-new-address`}
              value={newVenueAddress}
              onChange={(e) => onNewVenueAddressChange(e.target.value)}
              placeholder="e.g., 393 Princess St, Kingston, ON"
              required={required && (selectedVenueId === 'new' || showNewVenueFields)}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Please provide the complete street address including city and province
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

