import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96]",
  {
    variants: {
      variant: {
        rainbow: "btn-rainbow text-white",
        default: "btn-rainbow text-white",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shadow-sm",
        ghost: "hover:bg-accent text-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
        outline:
          "border-2 border-border bg-background text-foreground hover:bg-muted shadow-sm",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-4 text-xs rounded-lg",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "rainbow", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";
export { Button, buttonVariants };
