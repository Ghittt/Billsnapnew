import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-dark shadow-medium hover:shadow-strong transition-spring",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-medium transition-spring",
        outline: "border-2 border-border bg-background hover:bg-muted hover:border-primary transition-spring",
        secondary: "bg-muted text-foreground hover:bg-muted/80 transition-spring",
        ghost: "hover:bg-muted hover:text-foreground transition-spring",
        link: "text-primary underline-offset-4 hover:underline transition-smooth",
        hero: "bg-gradient-primary text-white hover:opacity-90 shadow-elegant transform hover:scale-105 transition-spring",
        savings: "bg-gradient-savings text-white hover:opacity-90 shadow-medium transition-spring",
        upload: "border-2 border-dashed border-primary/30 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10 transition-spring min-h-[48px]",
        cta: "bg-accent text-white hover:bg-accent-light shadow-medium hover:shadow-strong transform hover:scale-105 transition-spring",
      },
      size: {
        default: "min-h-[48px] h-11 px-6 py-3",
        sm: "min-h-[44px] h-9 rounded-lg px-4",
        lg: "min-h-[56px] h-14 rounded-2xl px-10 text-base",
        icon: "min-h-[48px] min-w-[48px] h-11 w-11",
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
