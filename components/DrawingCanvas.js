'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function DrawingCanvas() {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [pixels, setPixels] = useState([]);
  const [selectedPixel, setSelectedPixel] = useState(null);
  const [selectedPixelPosition, setSelectedPixelPosition] = useState(null);
  const [color, setColor] = useState('#ff0000');
  const [canvasSize, setCanvasSize] = useState({ width: 2000, height: 2000 });
  const [pixelSize, setPixelSize] = useState(10);
  const [hoverPixel, setHoverPixel] = useState(null);
//aa
  // Predefined color palette
  const colorPalette = [
    '#000000', // Black
    '#FFFFFF', // White
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
    '#800080', // Purple
    '#008000', // Dark Green
    '#A52A2A', // Brown
  ];

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
      ctx.globalAlpha = 1; 
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
    
    // Set the selected pixel and its position
    setSelectedPixel({ x, y });
    setSelectedPixelPosition({
      x: e.clientX,
      y: e.clientY
    });
  };
  
  const confirmPixel = async () => {
    if (!selectedPixel || !user) return;

    try {
      console.log('Placing pixel at:', selectedPixel.x, selectedPixel.y, 'with color:', color);
      
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
      
      if (data && data.success) {
        console.log('Pixel updated successfully:', data.pixel);
      }
      
      // Clear selection
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
      {/* Color palette header */}
      <div className="w-full mb-2 p-2 bg-white border border-amber-300 rounded-t-md shadow-sm">
        <div className="flex flex-wrap justify-center gap-2">
          {colorPalette.map((paletteColor) => (
            <button
              key={paletteColor}
              className={`w-8 h-8 rounded-md border ${
                color === paletteColor ? 'border-black border-2' : 'border-gray-300'
              }`}
              style={{ backgroundColor: paletteColor }}
              onClick={() => setColor(paletteColor)}
              aria-label={`Select ${paletteColor} color`}
            />
          ))}
        </div>
      </div>
      
      {/* Canvas */}
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
      
      {/* Simple confirmation popup */}
      {selectedPixel && selectedPixelPosition && user && (
        <div 
          className="absolute z-10 bg-white border border-gray-300 rounded-md shadow-sm p-1 flex"
          style={{
            left: `${selectedPixel.x * pixelSize + pixelSize/2}px`, 
            top: `${selectedPixel.y * pixelSize + pixelSize/2}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <button
            onClick={confirmPixel}
            className="w-6 h-6 rounded-sm bg-gray-200 text-gray-700 flex items-center justify-center mr-1 hover:bg-gray-300"
            aria-label="Confirm pixel placement"
          >
            ✓
          </button>
          
          <button
            onClick={cancelSelection}
            className="w-6 h-6 rounded-sm bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300"
            aria-label="Cancel pixel placement"
          >
            ✕
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
