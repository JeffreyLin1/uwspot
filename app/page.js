'use client';

import Navbar from "@/components/Navbar";
import DrawingCanvas from "@/components/DrawingCanvas";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-amber-50">
      <Navbar />
      
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl font-bold text-amber-600">UWSpot</h1>
          
          <div className="mt-8">
            <DrawingCanvas />
          </div>
          
          {loading ? (
            <p className="mt-4 text-gray-700">Loading...</p>
          ) : user ? (
            <div className="mt-6">
              <p className="text-xl text-gray-800">You are signed in as {user.email}</p>
              <p className="mt-4 text-gray-700">
                Click on the canvas to place a pixel!
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-xl text-gray-800">
                Get started by signing in or creating an account
              </p>
              <div className="mt-6 flex justify-center space-x-4">
                <Link
                  href="/signin"
                  className="rounded-md bg-amber-500 px-4 py-2 text-black hover:bg-amber-600"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md border border-amber-500 px-4 py-2 text-amber-700 hover:bg-amber-50"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
