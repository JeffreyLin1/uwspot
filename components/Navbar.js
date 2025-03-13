'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/signin');
  };

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
