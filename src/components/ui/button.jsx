import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? "span" : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-sm": variant === "default",
          "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100": variant === "secondary",
          "bg-red-600 text-white border-red-700 hover:bg-red-700": variant === "destructive",
          "bg-white text-blue-600 border-gray-300 hover:bg-blue-50": variant === "outline",
          "bg-transparent text-blue-600 border-transparent hover:bg-blue-50": variant === "ghost",
          "text-blue-600 border-transparent hover:underline": variant === "link",
        },
        {
          "h-10 px-4 py-2": size === "default",
          "h-9 px-3 py-1": size === "sm",
          "h-11 px-6 py-2": size === "lg",
          "h-8 w-8 p-0": size === "icon",
        },
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button };
