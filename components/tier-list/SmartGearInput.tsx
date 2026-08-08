'use client';

import { useState, useEffect, useRef } from 'react';
import type { GearSearchResult } from '@/app/api/gear/search/route';
import { Search, Activity } from 'lucide-react';

type SmartGearInputProps = {
  onSelectGear: (gear: {
    brand: string;
    model: string;
    category: string;
    price: number;
    driver_type: string;
    graph_url: string;
  }) => void;
};

export default function SmartGearInput({ onSelectGear }: SmartGearInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GearSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/gear/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Gear search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: GearSearchResult) => {
    onSelectGear({
      brand: item.brand,
      model: item.model,
      category: item.category,
      price: item.price,
      driver_type: item.driver_type,
      graph_url: item.graph_url,
    });
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-lg font-sans" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4 text-gray-400" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search brand or model (e.g. 'Letshuoer S08', 'Aria 2', 'Zero 2')..."
          className="w-full bg-[#f8faf9] text-xs sm:text-sm text-[#111827] placeholder:text-gray-400 rounded-xl pl-10 pr-10 py-2.5 border border-gray-200 focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 focus:outline-none transition-all duration-200 font-sans"
        />

        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="w-4 h-4 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Real-time Search Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-[#eaefec] rounded-2xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 font-sans">
          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500 font-normal">
              No matching gear found. Keep typing to add custom gear!
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full px-4 py-3 text-left hover:bg-[#f8faf9] transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-[#111827] group-hover:text-[#10b981] transition-colors">
                        {item.brand} {item.model}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e6f7f0] text-[#059669] border border-[#a7f3d0]">
                        {item.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 block mt-0.5">
                      {item.driver_type} &bull; ${item.price}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#059669] bg-[#e6f7f0] px-2.5 py-1 rounded-full border border-[#a7f3d0]">
                    <Activity className="w-3 h-3" />
                    <span>Graph Attached</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
