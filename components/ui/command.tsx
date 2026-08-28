"use client";

import * as React from "react";
import * as CommandPrimitive from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Command>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Command>
>(function Command({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Command
      ref={ref}
      className={cn(
        "min-w-full overflow-hidden rounded-xl bg-transparent",
        className
      )}
      {...props}
    />
  );
});

interface CommandDialogProps extends React.ComponentPropsWithoutRef<
  typeof Dialog.Root
> {
  className?: string;
  trigger: React.ReactNode;
}

const CommandDialog = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  CommandDialogProps
>(function CommandDialog(
  { open, onOpenChange, className, trigger, children, ...props },
  ref
) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} {...props}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          ref={ref}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-dark-500 shadow-2xl outline-none",
            className
          )}
        >
          <Command>{children}</Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
});

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.CommandInput>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.CommandInput>
>(function CommandInput({ className, ...props }, ref) {
  return (
    <CommandPrimitive.CommandInput
      ref={ref}
      className={cn(
        "w-full border-none bg-transparent px-4 py-4 text-sm text-white outline-none placeholder:text-purple-200/70",
        className
      )}
      {...props}
    />
  );
});

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.CommandList>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.CommandList>
>(function CommandList({ className, ...props }, ref) {
  return (
    <CommandPrimitive.CommandList
      ref={ref}
      className={cn("max-h-[32rem] overflow-y-auto px-0 py-2", className)}
      {...props}
    />
  );
});

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.CommandGroup>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.CommandGroup>
>(function CommandGroup({ className, ...props }, ref) {
  return (
    <CommandPrimitive.CommandGroup
      ref={ref}
      className={cn("px-2 py-2", className)}
      {...props}
    />
  );
});

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.CommandItem>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.CommandItem>
>(function CommandItem({ className, ...props }, ref) {
  return (
    <CommandPrimitive.CommandItem
      ref={ref}
      className={cn(
        "focus:shadow-[inset_0_0_0_1px] focus:shadow-ring data-[selected=true]:bg-dark-400 data-[selected=true]:text-white rounded-md px-3 py-3 outline-none",
        className
      )}
      {...props}
    />
  );
});

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.CommandEmpty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.CommandEmpty>
>(function CommandEmpty({ className, ...props }, ref) {
  return (
    <CommandPrimitive.CommandEmpty
      ref={ref}
      className={cn("px-4 py-6 text-center text-sm text-gray-400", className)}
      {...props}
    />
  );
});

export {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
};
