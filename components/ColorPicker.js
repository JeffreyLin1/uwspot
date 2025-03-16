import { CirclePicker } from "react-color";
import { useState } from "react";

export default function ColorPicker({ onChange }) {
  const [color, setColor] = useState("#ff0000");
  const [isOpen, setIsOpen] = useState(false); // Sidebar open/close state

  const colors = [
    "#000000", "#FFFFFF", "#FF0000", "#00FF00",
    "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
    "#FFA500", "#800080", "#008000", "#A52A2A",
  ];

  const handleChange = (newColor) => {
    setColor(newColor.hex);
    onChange(newColor.hex);
  };

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="fixed left-0 top-0 h-full flex items-center">
      {/* Sidebar Container */}
      <div
        className={`bg-gray-50  shadow-lg border border-gray-200 transition-all duration-300 ease-in-out ${
          isOpen ? "w-72 p-4" : "items-center justify-center w-14 p-2"
        } h-fit rounded-r-2xl`}
      >
       
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 flex justify-center items-center bg-gray-100 hover:bg-gray-200 rounded-full mb-2 transition-all duration-300 ease-in-out transform hover:scale-110"
          >
            {isOpen ? "←" : "🎨"}
          </button>

          {/* Color Picker */}
        {isOpen && (
          <CirclePicker
            color={color}
            colors={colors}
            onChange={handleChange}
            circleSize={30}
            circleSpacing={12}
          />
        )}
      </div>
    </div>
  );
}
