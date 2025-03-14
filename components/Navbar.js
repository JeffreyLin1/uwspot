'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [onlineUsers, setOnlineUsers] = useState(0);

  const handleSignOut = async () => {
    await signOut();
    router.push('/signin');
  };

  useEffect(() => {
    // Only track presence for authenticated users
    if (!user) return;

    // Create a unique channel for this user
    const channel = supabase.channel(`presence`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track online users
    const handlePresenceChange = () => {
      const state = channel.presenceState();
      // Count unique users by their IDs
      const uniqueUsers = new Set(Object.keys(state));
      setOnlineUsers(uniqueUsers.size);
    };

    // Subscribe to presence changes
    channel
      .on('presence', { event: 'sync' }, handlePresenceChange)
      .on('presence', { event: 'join' }, handlePresenceChange)
      .on('presence', { event: 'leave' }, handlePresenceChange)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Enter the channel with this user's info
          await channel.track({
            user_id: user.id,
            email: user.email,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return (
    <nav className="bg-amber-50 shadow border-b border-amber-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/" className="text-2xl font-bold text-amber-600">
                UWSpot
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {/* Users online indicator */}
            {user && (
              <div className="mr-6 flex items-center">
                <div className="flex items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm text-gray-700">
                    {onlineUsers} {onlineUsers === 1 ? 'user' : 'users'} online
                  </span>
                </div>
              </div>
            )}
            
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700">{user.email}</span>
                    <button
                      onClick={handleSignOut}
                      className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black hover:bg-amber-600"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="space-x-4">
                    <Link
                      href="/signin"
                      className="rounded-md bg-amber-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-amber-200"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black hover:bg-amber-600"
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
