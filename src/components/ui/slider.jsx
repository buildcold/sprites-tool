import * as React from "react";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef(({ className, min = 1, max = 100, step = 1, value, onChange, ...props }, ref) => {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      className={cn(
        "w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Slider.displayName = "Slider";

export { Slider };
