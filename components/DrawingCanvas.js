'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function DrawingCanvas() {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [pixels, setPixels] = useState([]);
  const [selectedPixel, setSelectedPixel] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [pixelSize, setPixelSize] = useState(10);
  
  // Load existing pixels from Supabase
  useEffect(() => {
    const fetchPixels = async () => {
      const { data, error } = await supabase
        .from('pixels')
        .select('*');
      
      if (error) {
        console.error('Error fetching pixels:', error);
        return;
      }
      
      setPixels(data || []);
    };
    
    fetchPixels();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('pixels-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pixels' 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPixels(prev => [...prev, payload.new]);
        }
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Draw the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    
    // Draw grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= canvasSize.width; x += pixelSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= canvasSize.height; y += pixelSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }
    
    // Draw existing pixels
    ctx.fillStyle = 'black';
    pixels.forEach(pixel => {
      ctx.fillRect(
        pixel.x * pixelSize, 
        pixel.y * pixelSize, 
        pixelSize, 
        pixelSize
      );
    });
    
    // Draw selected pixel with highlight
    if (selectedPixel) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(
        selectedPixel.x * pixelSize,
        selectedPixel.y * pixelSize,
        pixelSize,
        pixelSize
      );
    }
  }, [pixels, selectedPixel, canvasSize, pixelSize]);
  
  const handleCanvasClick = (e) => {
    if (!user) return; // Only authenticated users can select pixels
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);
    
    // Check if this pixel already exists
    const pixelExists = pixels.some(p => p.x === x && p.y === y);
    
    if (!pixelExists) {
      setSelectedPixel({ x, y });
    }
  };
  
  const confirmPixel = async () => {
    if (!selectedPixel || !user) return;
    
    try {
      const { error } = await supabase
        .from('pixels')
        .insert([
          { 
            x: selectedPixel.x, 
            y: selectedPixel.y, 
            user_id: user.id 
          }
        ]);
        
      if (error) throw error;
      
      // Clear selection after successful insertion
      setSelectedPixel(null);
    } catch (error) {
      console.error('Error adding pixel:', error);
    }
  };
  
  const cancelSelection = () => {
    setSelectedPixel(null);
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className="border border-amber-300 bg-white">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleCanvasClick}
          className="cursor-pointer"
        />
      </div>
      
      {selectedPixel && user && (
        <div className="mt-4 flex space-x-4">
          <button
            onClick={confirmPixel}
            className="rounded-md bg-amber-500 px-4 py-2 text-black hover:bg-amber-600"
          >
            Confirm Pixel
          </button>
          <button
            onClick={cancelSelection}
            className="rounded-md border border-amber-500 px-4 py-2 text-amber-700 hover:bg-amber-50"
          >
            Cancel
          </button>
        </div>
      )}
      
      {!user && (
        <p className="mt-4 text-gray-700">
          Sign in to draw on the canvas!
        </p>
      )}
    </div>
  );
}
