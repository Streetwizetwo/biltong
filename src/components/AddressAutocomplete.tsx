"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MapPin, Loader2, Search } from "lucide-react";
import { STANGER_ADDRESSES, SA_CITIES } from "@/lib/supabase";

// Structured address from Google Maps
export interface StructuredAddress {
  street_address: string;
  local_area: string;
  city: string;
  zone: string;
  code: string;
  formatted: string;
}

// A prediction from Google Places or static fallback
interface AddressPrediction {
  place_id?: string;
  description: string;
  main_text?: string;
  secondary_text?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, structured?: StructuredAddress) => void;
  onStructuredAddress?: (addr: StructuredAddress | null) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onStructuredAddress,
  placeholder = "Start typing your address...",
  className = "",
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Static fallback suggestions
  const staticSuggestions = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    const stanger = STANGER_ADDRESSES.filter((a) =>
      a.toLowerCase().includes(q)
    );
    const cities = SA_CITIES.filter(
      (a) => a.toLowerCase().includes(q) && !a.toLowerCase().includes("stanger")
    );
    return [
      ...stanger.map((a) => ({ description: a, place_id: undefined })),
      ...cities.map((a) => ({ description: a, place_id: undefined })),
    ];
  }, [query]);

  // Fetch Google Places autocomplete suggestions
  const fetchPredictions = useCallback(
    async (input: string) => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      const controller = new AbortController();
      fetchControllerRef.current = controller;

      try {
        const res = await fetch(
          `/api/places/autocomplete?q=${encodeURIComponent(input)}`,
          { signal: controller.signal }
        );
        const data = await res.json();

        if (data.fallback) {
          // Google Maps not configured — use static suggestions
          setGoogleAvailable(false);
          setPredictions([]);
          return;
        }

        setGoogleAvailable(true);
        setPredictions(data.predictions || []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.warn("[AddressAutocomplete] Fetch error:", err);
          setGoogleAvailable(false);
          setPredictions([]);
        }
      }
    },
    []
  );

  // Debounced input handler
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setPredictions([]);
      return;
    }

    if (googleAvailable) {
      setLoading(true);
      debounceRef.current = setTimeout(() => {
        fetchPredictions(query).finally(() => setLoading(false));
      }, 300);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, googleAvailable, fetchPredictions]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    setSelectedPlaceId(null);
    // Clear structured address since user is typing
    onStructuredAddress?.(null);
    // Pass the raw text back
    onChange(val);
  };

  // Fetch place details when a Google Place is selected
  const fetchPlaceDetails = useCallback(
    async (placeId: string, description: string) => {
      try {
        const res = await fetch(
          `/api/places/details?place_id=${encodeURIComponent(placeId)}`
        );
        const data = await res.json();

        if (data.structured) {
          setQuery(data.formatted_address || description);
          onChange(data.formatted_address || description, data.structured);
          onStructuredAddress?.(data.structured);
          return;
        }
      } catch (err) {
        console.warn("[AddressAutocomplete] Details fetch error:", err);
      }

      // Fallback: just use the description
      setQuery(description);
      onChange(description);
    },
    [onChange, onStructuredAddress]
  );

  // Handle suggestion selection
  const handleSelect = useCallback(
    (prediction: AddressPrediction) => {
      setShowDropdown(false);
      setSelectedPlaceId(prediction.place_id || null);

      if (prediction.place_id) {
        // Google Place — fetch details for structured address
        fetchPlaceDetails(prediction.place_id, prediction.description);
      } else {
        // Static suggestion — just set the text
        setQuery(prediction.description);
        onChange(prediction.description);
      }
    },
    [fetchPlaceDetails, onChange]
  );

  // Determine which suggestions to show
  const displayPredictions = googleAvailable
    ? predictions
    : staticSuggestions;

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5B83C]/50 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className={`w-full bg-white/8 border border-[#E5B83C]/30 rounded-xl pl-10 pr-10 py-3 text-[#FEF3DF] text-sm placeholder:text-[#FEF3DF]/25 focus:outline-none focus:border-[#E5B83C] focus:bg-white/12 transition-all ${className}`}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5B83C]/60 animate-spin" />
        )}
        {!loading && query.length >= 2 && (
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5B83C]/30" />
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && displayPredictions.length > 0 && query.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 bg-[#2A1508] rounded-xl mt-1 max-h-[220px] overflow-y-auto z-50 shadow-2xl border border-[#E5B83C]/20"
        >
          {googleAvailable && (
            <div className="px-4 py-2 border-b border-[#E5B83C]/10 flex items-center gap-1.5">
              <span className="text-[0.55rem] text-[#E5B83C]/40 tracking-wider uppercase font-semibold">
                Powered by Google Maps
              </span>
            </div>
          )}
          {displayPredictions.map((pred, idx) => (
            <button
              key={pred.place_id || `static-${idx}`}
              onClick={() => handleSelect(pred)}
              className="w-full text-left px-4 py-2.5 text-sm text-[#FEF3DF] cursor-pointer border-b border-[#E5B83C]/5 hover:bg-[#E5B83C]/15 hover:text-[#F8E5B0] transition-colors last:border-b-0"
            >
              {pred.main_text && pred.secondary_text ? (
                <span>
                  <span className="font-semibold">{pred.main_text}</span>
                  <span className="text-[#FEF3DF]/50 text-xs ml-1">
                    {pred.secondary_text}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-[#E5B83C]/50 flex-shrink-0" />
                  {pred.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown &&
        query.length >= 2 &&
        displayPredictions.length === 0 &&
        !loading && (
          <div className="absolute top-full left-0 right-0 bg-[#2A1508] rounded-xl mt-1 z-50 shadow-2xl border border-[#E5B83C]/20 p-3">
            <p className="text-xs text-[#FEF3DF]/40 text-center">
              {googleAvailable
                ? "No addresses found. Try a different search."
                : "Type your full address (e.g. 12 Main Rd, Durban, KwaZulu-Natal)"}
            </p>
          </div>
        )}

      {/* Address format hint */}
      <p className="text-[0.6rem] text-[#FEF3DF]/35 mt-1.5 flex items-center gap-1.5">
        {googleAvailable ? (
          <>
            <span className="inline-block w-1.5 h-1.5 bg-[#2E7D32] rounded-full" />
            Google Maps address lookup active
          </>
        ) : (
          <>
            Format: Street, Suburb, City, Province, Postal Code
          </>
        )}
      </p>
    </div>
  );
}
