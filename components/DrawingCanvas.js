'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import ColorPicker from './ColorPicker';

export default function DrawingCanvas() {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [pixels, setPixels] = useState([]);
  const [selectedPixel, setSelectedPixel] = useState(null);
  const [selectedPixelPosition, setSelectedPixelPosition] = useState(null); // Track screen position
  const [color, setColor] = useState('#ff0000');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 });
  const [pixelSize, setPixelSize] = useState(10);
  const [hoverPixel, setHoverPixel] = useState(null);

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
        console.log('Received payload:', payload);
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          // Update the specific pixel in the local state
          setPixels(prev => {
            const existingPixelIndex = prev.findIndex(p => 
              p.id === payload.new.id
            );
            
            if (existingPixelIndex >= 0) {
              // Replace existing pixel
              return prev.map(p => p.id === payload.new.id ? payload.new : p);
            } else {
              // Add new pixel
              return [...prev, payload.new];
            }
          });
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
    
    // Draw existing pixels
    pixels.forEach(pixel => {
      ctx.fillStyle = pixel.color || 'black'; // Default to black if no color specified
      ctx.fillRect(
        pixel.x * pixelSize, 
        pixel.y * pixelSize, 
        pixelSize, 
        pixelSize
      );
    });
    
    // Draw selected pixel with highlight
    if (selectedPixel) {
      ctx.fillStyle = color;
      ctx.fillRect(
        selectedPixel.x * pixelSize,
        selectedPixel.y * pixelSize,
        pixelSize,
        pixelSize
      );
    }
    
    // Draw hover preview
    if (hoverPixel && !selectedPixel && user) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 1; // Make it semi-transparent
      ctx.fillRect(
        hoverPixel.x * pixelSize,
        hoverPixel.y * pixelSize,
        pixelSize,
        pixelSize
      );
      ctx.globalAlpha = 1.0; // Reset transparency
    }
  }, [pixels, selectedPixel, hoverPixel, canvasSize, pixelSize, color, user]);
  
  const handleCanvasClick = (e) => {
    if (!user) return; // Only authenticated users can select pixels
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);
    
    // Calculate the screen position for the popup
    const pixelScreenX = rect.left + (x * pixelSize);
    const pixelScreenY = rect.top + (y * pixelSize);
    
    // Allow selection regardless of whether a pixel exists
    setSelectedPixel({ x, y });
    setSelectedPixelPosition({ x: pixelScreenX, y: pixelScreenY });
  };
  
  const confirmPixel = async () => {
    if (!selectedPixel || !user) return;

    try {
      console.log('Confirming pixel:', selectedPixel, color);
      console.log('User ID:', user.id, 'Type:', typeof user.id);
      
      // Call the Supabase function to update the pixel
      const { data, error } = await supabase.rpc('update_pixel', {
        pixel_x: selectedPixel.x,
        pixel_y: selectedPixel.y,
        new_color: color,
        user_uuid: user.id
      });
      
      if (error) {
        console.error('Error updating pixel:', error);
        throw error;
      }
      
      console.log('Response from update_pixel:', data);
      
      if (data && data.success) {
        console.log('Pixel updated successfully:', data.pixel);
      }

      setSelectedPixel(null);
      setSelectedPixelPosition(null);
    } catch (error) {
      console.error('Error updating pixel:', error);
    }
  };
  
  const cancelSelection = () => {
    setSelectedPixel(null);
    setSelectedPixelPosition(null);
  };
  
  const handleCanvasMouseMove = (e) => {
    if (!user || selectedPixel) return; // Only show hover when not selecting and user is logged in
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);
    
    setHoverPixel({ x, y });
  };

  const handleCanvasMouseLeave = () => {
    setHoverPixel(null);
  };
  
  return (
    <div className="flex flex-col items-center relative">
      <div className="border border-amber-300 bg-white">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          className="cursor-pointer"
        />
      </div>

      {/* Popup for color picker and buttons */}
      {selectedPixel && selectedPixelPosition && user && (
        <div 
          className="absolute z-10 bg-white border border-amber-300 rounded-md shadow-lg p-4"
          style={{
            left: `${selectedPixelPosition.x}px`, 
            top: `${selectedPixelPosition.y}px`,
            transform: 'translate(-180%, -50%)'
          }}
        >
          <div className="mb-4">
            <ColorPicker onChange={setColor} />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={confirmPixel}
              className="rounded-md bg-amber-500 px-4 py-2 text-black hover:bg-amber-600"
            >
              Confirm
            </button>
            
            <button
              onClick={cancelSelection}
              className="rounded-md border border-amber-500 px-4 py-2 text-amber-700 hover:bg-amber-50"
            >
              Cancel
            </button>
          </div>
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
