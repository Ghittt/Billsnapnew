import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft transition-smooth",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-primary text-primary-foreground hover:bg-gradient-hero shadow-medium hover:shadow-strong transform hover:scale-105 transition-bounce font-semibold",
        savings: "bg-gradient-savings text-primary-foreground hover:bg-success/90 shadow-medium animate-pulse-glow font-semibold",
        upload: "border-2 border-dashed border-primary/30 bg-primary/5 text-primary hover:border-primary/60 hover:bg-primary/10 transition-smooth font-medium min-h-[44px]",
        cta: "bg-accent text-accent-foreground hover:bg-accent-light shadow-medium hover:shadow-strong transform hover:scale-105 transition-bounce font-bold",
      },
      size: {
        default: "min-h-[44px] h-10 px-4 py-2",
        sm: "min-h-[44px] h-9 rounded-md px-3",
        lg: "min-h-[44px] h-11 rounded-md px-8",
        icon: "min-h-[44px] min-w-[44px] h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
