import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, darkMode = false, ...props }, ref) => {
  return (
    <input
      type={type}
      style={{
        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
        borderColor: darkMode ? '#4b5563' : '#d1d5db',
        color: darkMode ? '#ffffff' : '#111827',
        placeholderColor: darkMode ? '#9ca3af' : '#6b7280'
      }}
      className={cn(
        "flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
