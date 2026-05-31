"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MapPin, Loader2, Search, Navigation } from "lucide-react";
import { STANGER_ADDRESSES, SA_CITIES } from "@/lib/supabase";

// Structured address compatible with Courier Guy API
export interface StructuredAddress {
  street_address: string;
  local_area: string;
  city: string;
  zone: string;
  code: string;
  formatted: string;
  lat?: number;
  lng?: number;
}

// A prediction from Here Maps or static fallback
interface AddressPrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  resultType?: string;
  // Here Maps autosuggest already returns structured address data
  structured?: {
    street_address: string;
    local_area: string;
    city: string;
    zone: string;
    code: string;
    lat?: number;
    lng?: number;
  };
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
  placeholder = "Start typing your delivery address...",
  className = "",
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [hereMapsAvailable, setHereMapsAvailable] = useState(true);
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

  // Static fallback suggestions (Stanger + major SA cities)
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
      ...stanger.map((a) => ({ description: a, place_id: "", main_text: a, secondary_text: "Stanger, KZN" })),
      ...cities.map((a) => ({ description: a, place_id: "", main_text: a, secondary_text: "" })),
    ];
  }, [query]);

  // Fetch Here Maps autocomplete predictions
  const fetchPredictions = useCallback(async (input: string) => {
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
        setHereMapsAvailable(false);
        setPredictions([]);
        return;
      }

      setHereMapsAvailable(true);
      setPredictions(data.predictions || []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.warn("[AddressAutocomplete] Fetch error:", err);
        setHereMapsAvailable(false);
        setPredictions([]);
      }
    }
  }, []);

  // Debounced input handler
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setPredictions([]);
      return;
    }

    if (hereMapsAvailable) {
      setLoading(true);
      debounceRef.current = setTimeout(() => {
        fetchPredictions(query).finally(() => setLoading(false));
      }, 300);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, hereMapsAvailable, fetchPredictions]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    onStructuredAddress?.(null);
    onChange(val);
  };

  // Handle suggestion selection
  const handleSelect = useCallback(
    async (prediction: AddressPrediction) => {
      setShowDropdown(false);

      // If Here Maps autosuggest already gave us structured data (street + city),
      // use it directly — no need for a second API call
      if (prediction.structured && prediction.structured.city) {
        const s = prediction.structured;
        const formatted = prediction.description ||
          [s.street_address, s.local_area, s.city, s.zone, s.code].filter(Boolean).join(", ");
        const structuredAddr: StructuredAddress = {
          street_address: s.street_address,
          local_area: s.local_area,
          city: s.city,
          zone: s.zone,
          code: s.code,
          formatted,
          lat: s.lat,
          lng: s.lng,
        };
        setQuery(formatted);
        onChange(formatted, structuredAddr);
        onStructuredAddress?.(structuredAddr);
        return;
      }

      // If no place_id (static suggestion), just set the text
      if (!prediction.place_id) {
        setQuery(prediction.description);
        onChange(prediction.description);
        return;
      }

      // If we have a place_id but no structured data, fetch details
      setDetailsLoading(true);
      try {
        const res = await fetch(
          `/api/places/details?place_id=${encodeURIComponent(prediction.place_id)}`
        );
        const data = await res.json();

        if (data.structured) {
          const s = data.structured;
          const structuredAddr: StructuredAddress = {
            street_address: s.street_address,
            local_area: s.local_area,
            city: s.city,
            zone: s.zone,
            code: s.code,
            formatted: s.formatted || data.formatted_address,
            lat: s.lat,
            lng: s.lng,
          };
          setQuery(structuredAddr.formatted);
          onChange(structuredAddr.formatted, structuredAddr);
          onStructuredAddress?.(structuredAddr);
        } else {
          setQuery(prediction.description);
          onChange(prediction.description);
        }
      } catch (err) {
        console.warn("[AddressAutocomplete] Details fetch error:", err);
        setQuery(prediction.description);
        onChange(prediction.description);
      } finally {
        setDetailsLoading(false);
      }
    },
    [onChange, onStructuredAddress]
  );

  // Determine which suggestions to show
  const displayPredictions = hereMapsAvailable
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
          disabled={detailsLoading}
        />
        {(loading || detailsLoading) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5B83C]/60 animate-spin" />
        )}
        {!loading && !detailsLoading && query.length >= 2 && (
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5B83C]/30" />
        )}
      </div>

      {/* Loading address details overlay */}
      {detailsLoading && (
        <div className="absolute top-full left-0 right-0 bg-[#2A1508] rounded-xl mt-1 z-50 shadow-2xl border border-[#E5B83C]/20 p-3">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-[#E5B83C] animate-spin" />
            <span className="text-xs text-[#FEF3DF]/60">Looking up address details...</span>
          </div>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && displayPredictions.length > 0 && query.length >= 2 && !detailsLoading && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 bg-[#2A1508] rounded-xl mt-1 max-h-[260px] overflow-y-auto z-50 shadow-2xl border border-[#E5B83C]/20"
        >
          {hereMapsAvailable && (
            <div className="px-4 py-2 border-b border-[#E5B83C]/10 flex items-center gap-1.5 sticky top-0 bg-[#2A1508] z-10">
              <Navigation className="w-3 h-3 text-[#E5B83C]/50" />
              <span className="text-[0.55rem] text-[#E5B83C]/50 tracking-wider uppercase font-semibold">
                SA Delivery Addresses
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
                <span className="flex items-start gap-2">
                  <MapPin className="w-3 h-3 text-[#E5B83C]/40 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-semibold">{pred.main_text}</span>
                    <span className="text-[#FEF3DF]/50 text-xs ml-1 block">
                      {pred.secondary_text}
                    </span>
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-[#E5B83C]/40 flex-shrink-0" />
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
        !loading &&
        !detailsLoading && (
          <div className="absolute top-full left-0 right-0 bg-[#2A1508] rounded-xl mt-1 z-50 shadow-2xl border border-[#E5B83C]/20 p-3">
            <p className="text-xs text-[#FEF3DF]/40 text-center">
              {hereMapsAvailable
                ? "No addresses found. Try a different search or type your full address."
                : "Type your full address (e.g. 12 Main Rd, Durban, KwaZulu-Natal)"}
            </p>
          </div>
        )}

      {/* Status indicator */}
      <p className="text-[0.6rem] text-[#FEF3DF]/35 mt-1.5 flex items-center gap-1.5">
        {hereMapsAvailable ? (
          <>
            <span className="inline-block w-1.5 h-1.5 bg-[#2E7D32] rounded-full" />
            Address lookup active
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
