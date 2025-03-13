import { SketchPicker } from "react-color";
import { useState } from "react";

export default function ColorPicker({ onChange }) {
  const [color, setColor] = useState("#ff0000");

  const handleChange = (newColor) => {
    setColor(newColor.hex); // Update local state
    onChange(newColor.hex); // Send selected color to parent
  };

  return <SketchPicker color={color} onChange={handleChange} />;
}
