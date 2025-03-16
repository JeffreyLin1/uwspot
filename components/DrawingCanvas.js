'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { CirclePicker } from "react-color";

export default function DrawingCanvas() {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [pixels, setPixels] = useState([]);
  const [selectedPixel, setSelectedPixel] = useState(null);
  const [selectedPixelPosition, setSelectedPixelPosition] = useState(null);
  const [color, setColor] = useState('#ff0000');
  const [canvasSize, setCanvasSize] = useState({ width: 1650, height: 2000 });
  const [pixelSize, setPixelSize] = useState(10);
  const [hoverPixel, setHoverPixel] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panningMode, setPanningMode] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

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
    
    // Apply zoom and pan transformations
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);
    
    // Draw existing pixels
    pixels.forEach(pixel => {
      ctx.fillStyle = pixel.color || 'white'; // Default to white if no color specified
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
    if (hoverPixel && !selectedPixel && user && !panningMode) {
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
    
    // Restore the context
    ctx.restore();
  }, [pixels, selectedPixel, hoverPixel, canvasSize, pixelSize, color, user, zoomLevel, panOffset, panningMode]);
  
  const handleCanvasClick = (e) => {
    if (!user) return; // Only authenticated users can select pixels
    if (isDragging) return; // Don't place pixels while dragging
    if (panningMode) return; // Don't place pixels in panning mode
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the position considering zoom and pan
    const x = Math.floor(((e.clientX - rect.left) / zoomLevel - panOffset.x / zoomLevel) / pixelSize);
    const y = Math.floor(((e.clientY - rect.top) / zoomLevel - panOffset.y / zoomLevel) / pixelSize);
    
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

      console.log(data);
      
      if (error) {
        console.error('Error updating pixel:', error);
        throw error;
      }
      
      if (data && data.success) {
        console.log('Pixel updated successfully:', data.pixel);
      }

      // Update the pixel in the local state
      setPixels(prev => {
        const existingPixelIndex = prev.findIndex(p =>
          p.x === selectedPixel.x && p.y === selectedPixel.y
        );
        if (existingPixelIndex >= 0) {
          const newPixels = [...prev];
          newPixels[existingPixelIndex] = { ...prev[existingPixelIndex], color };
          return newPixels;
        }
        // Add new pixel
        return [...prev, { x: selectedPixel.x, y: selectedPixel.y, color }];
      });
      
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
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (isDragging) {
      // Handle panning
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      setPanOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
      return;
    }
    
    if (!user || selectedPixel || panningMode) return; // Don't show hover in panning mode
    
    // Calculate hover position with zoom and pan
    const x = Math.floor(((e.clientX - rect.left) / zoomLevel - panOffset.x / zoomLevel) / pixelSize);
    const y = Math.floor(((e.clientY - rect.top) / zoomLevel - panOffset.y / zoomLevel) / pixelSize);
    
    setHoverPixel({ x, y });
  };

  const handleCanvasMouseLeave = () => {
    setHoverPixel(null);
    if (isDragging) {
      setIsDragging(false);
    }
  };
  
  // Handle mouse down for panning
  const handleCanvasMouseDown = (e) => {
    if (panningMode) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
      e.preventDefault(); // Prevent default behavior
    }
  };
  
  // Handle mouse up to stop panning
  const handleCanvasMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };
  
  // Reset zoom and pan
  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setPanningMode(false); // Exit panning mode when resetting view
  };
  
  // Toggle panning mode
  const togglePanningMode = () => {
    setPanningMode(prev => !prev);
    // If we're exiting panning mode, make sure we're not dragging
    if (panningMode) {
      setIsDragging(false);
    }
    // Close color picker when toggling panning mode
    setColorPickerOpen(false);
  };
  
  // Toggle color picker
  const toggleColorPicker = () => {
    setColorPickerOpen(prev => !prev);
    // Close panning mode when opening color picker
    if (!colorPickerOpen) {
      setPanningMode(false);
    }
  };
  
  // Handle color change
  const handleColorChange = (newColor) => {
    setColor(newColor.hex);
  };
  
  return (
    <div className="flex flex-col items-center relative">
      {/* Zoom, Pan, and Color Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white p-2 rounded-md shadow-md">
        <button 
          onClick={() => setZoomLevel(prev => Math.min(10, prev * 1.2))}
          className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-md hover:bg-gray-300"
          aria-label="Zoom in"
        >
          +
        </button>
        <button 
          onClick={() => setZoomLevel(prev => Math.max(0.1, prev / 1.2))}
          className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-md hover:bg-gray-300"
          aria-label="Zoom out"
        >
          -
        </button>
        <button 
          onClick={togglePanningMode}
          className={`w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-300 ${
            panningMode ? 'bg-amber-300' : 'bg-gray-200'
          }`}
          aria-label="Toggle panning mode"
          title="Toggle panning mode"
        >
          ✋
        </button>
        <button 
          onClick={toggleColorPicker}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-300 border border-gray-300"
          aria-label="Select color"
          title="Select color"
          style={{ backgroundColor: color }}
        >
        </button>
        <button 
          onClick={resetView}
          className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-md hover:bg-gray-300"
          aria-label="Reset view"
        >
          ↺
        </button>
        <div className="text-xs text-center mt-1">
          {Math.round(zoomLevel * 100)}%
        </div>
        
        {/* Color Picker Popup */}
        {colorPickerOpen && (
          <div className="absolute right-full mr-2 top-0 bg-white p-2 rounded-md shadow-md border border-gray-200">
            <CirclePicker
              color={color}
              colors={colorPalette}
              onChange={handleColorChange}
              circleSize={24}
              circleSpacing={8}
            />
          </div>
        )}
      </div>
      
      {/* Canvas */}
      <div className="border border-amber-300 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          className={`${isDragging ? 'cursor-grabbing' : panningMode ? 'cursor-grab' : 'cursor-pointer'}`}
        />
      </div>
      
      {/* Simple confirmation popup */}
      {selectedPixel && selectedPixelPosition && user && (
        <div 
          className="absolute z-10 bg-white border border-gray-300 rounded-md shadow-sm p-1 flex"
          style={{
            left: `${selectedPixelPosition.x}px`, 
            top: `${selectedPixelPosition.y}px`,
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
      
      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600 max-w-md text-center">
        <p>
          <strong>Controls:</strong> Use the zoom buttons to zoom in/out, click the hand icon to toggle panning mode
        </p>
      </div>
    </div>
  );
}

// Helper function to determine if text should be white or black based on background color
function getContrastColor(hexColor) {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance - standard formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
