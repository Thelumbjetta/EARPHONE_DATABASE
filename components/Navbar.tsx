/**
 * components/Navbar.tsx
 * =============================================================
 * Sticky Top Navigation Bar
 * =============================================================
 * Dynamic header displaying forum logo, nav links, quick search,
 * and authenticated user status (Avatar + Sign Out) or Sign In / Register links.
 * =============================================================
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import NotificationBell from './NotificationBell';
import { User, Settings, LogOut, Search, Plus, AudioWaveform, ChevronDown, Layers } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const user = session?.user;
  const username = user?.name;

  
  const [karma, setKarma] = useState<number>(0);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/user/stats');
        if (res.ok) {
          const data = await res.json();
          if (data.karma !== undefined) setKarma(data.karma);
        }
      } catch (err) {
        console.warn('Navbar stats fetch error:', err);
      }
    }
    fetchStats();
  }, [session]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatKarma = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k karma';
    return `${num} karma`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#eaefec] bg-white/95 backdrop-blur-md font-sans">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo: audiothread */}
        <div className="flex items-center gap-6">
          <Link href="/r" className="group flex items-center gap-2.5 transition-all duration-200 ease-in-out hover:opacity-90">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10b981] text-white shadow-sm font-bold">
              <AudioWaveform className="w-5 h-5" />
            </div>
            <div className="flex items-center tracking-tight text-xl font-extrabold font-sans">
              <span className="text-[#111827]">audio</span>
              <span className="text-[#10b981]">thread</span>
            </div>
          </Link>
        </div>

        {/* Center Search Bar */}
        <div className="relative flex-1 max-w-md mx-6 hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search audio gear, discussions, & tags..."
            className="w-full bg-[#f3f5f4] text-xs text-[#111827] placeholder:text-gray-400 rounded-full pl-10 pr-4 py-2 border border-transparent focus:outline-none focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-200 ease-in-out font-sans"
          />
        </div>

        {/* Right Section: Actions & User Profile */}
        <div className="flex items-center gap-4">
          
          {/* Action Buttons: New Post + Make Tier List */}
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/forum/threads/new"
              className="flex items-center gap-1.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-4 py-2 rounded-full shadow-sm transition-all duration-200 ease-in-out active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Post</span>
            </Link>

            <Link
              href="/tier-lists/new"
              className="flex items-center gap-1.5 bg-white hover:bg-[#f3f5f4] text-[#111827] font-bold text-xs px-4 py-2 rounded-full border border-[#eaefec] hover:border-[#10b981] shadow-sm transition-all duration-200 ease-in-out active:scale-95"
            >
              <Layers className="w-4 h-4 text-[#10b981]" />
              <span>Tier List</span>
            </Link>
          </div>

          {/* Mobile: only show New Post */}
          <Link
            href="/forum/threads/new"
            className="sm:hidden flex items-center gap-1.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-4 py-2 rounded-full shadow-sm transition-all duration-200 ease-in-out active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Post</span>
          </Link>

          {/* Notification Bell Icon */}
          <NotificationBell />

          {/* User Account / Profile Dropdown Card */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 p-1 rounded-full hover:bg-gray-100/80 transition-all duration-200 ease-in-out cursor-pointer select-none border border-transparent hover:border-gray-200"
              aria-label="User menu dropdown"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-100 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user?.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                  alt={user?.name || 'User avatar'}
                  className="w-full h-full object-cover"
                />
              </div>
              {username && (
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-xs font-bold text-[#111827] truncate max-w-[110px]">
                    u/{username}
                  </span>
                  <span className="text-[11px] font-bold text-[#10b981] font-sans">
                    {formatKarma(karma)}
                  </span>
                </div>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Popup */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-[#eaefec] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in duration-150 font-sans">
                <div className="px-4 py-2 border-b border-[#eaefec]">
                  <p className="text-xs font-bold text-[#111827]">{username ? `u/${username}` : 'Signed in'}</p>
                  <p className="text-[11px] text-[#10b981] font-semibold">{formatKarma(karma)}</p>
                </div>

                <div className="py-1">
                  <Link
                    href={username ? `/u/${username}` : '/settings'}
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#111827] hover:bg-[#e6f7f0] hover:text-[#10b981] transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-500 group-hover:text-[#10b981]" />
                    <span>Profile</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#111827] hover:bg-[#e6f7f0] hover:text-[#10b981] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-500 group-hover:text-[#10b981]" />
                    <span>Settings</span>
                  </Link>
                </div>

                <div className="border-t border-[#eaefec] pt-1">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

