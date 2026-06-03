"use client";

import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";

interface AddressInputProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Enter your full delivery address (e.g. 12 Main Rd, Durban, KZN)",
  className = "",
}: AddressInputProps) {
  const [query, setQuery] = useState(value);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5B83C]/50 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`w-full bg-white/8 border border-[#E5B83C]/30 rounded-xl pl-10 pr-4 py-3 text-[#FEF3DF] text-sm placeholder:text-[#FEF3DF]/25 focus:outline-none focus:border-[#E5B83C] focus:bg-white/12 transition-all ${className}`}
        autoComplete="street-address"
      />
      <p className="text-[0.6rem] text-[#FEF3DF]/35 mt-1.5 flex items-center gap-1.5">
        Format: Street, Suburb, City, Province, Postal Code
      </p>
    </div>
  );
}
