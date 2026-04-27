import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "../lib/utils";
const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => (_jsxs(ScrollAreaPrimitive.Root, { ref: ref, className: cn("relative overflow-hidden bg-zinc-950", className), ...props, children: [_jsx(ScrollAreaPrimitive.Viewport, { className: "h-full w-full rounded-[inherit] bg-zinc-950", children: children }), _jsx(ScrollBar, {}), _jsx(ScrollAreaPrimitive.Corner, { className: "bg-zinc-900" })] })));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;
const ScrollBar = React.forwardRef(({ className, orientation = "vertical", ...props }, ref) => (_jsx(ScrollAreaPrimitive.ScrollAreaScrollbar, { ref: ref, orientation: orientation, className: cn("flex touch-none select-none transition-colors bg-zinc-900/80", orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-zinc-800/70 p-[1px]", orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-zinc-800/70 p-[1px]", className), ...props, children: _jsx(ScrollAreaPrimitive.ScrollAreaThumb, { className: "relative flex-1 rounded-full bg-zinc-600 hover:bg-zinc-500" }) })));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;
export { ScrollArea, ScrollBar };
