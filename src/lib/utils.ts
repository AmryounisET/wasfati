import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The WDS type scale (text-display/h1/h2/h3/bodyl/bodym/bodys/caption/button/
// overline) is defined as custom `--text-*` theme tokens in globals.css.
// tailwind-merge doesn't know these are font-size utilities, so by default
// it lumps any `text-{word}` together as one conflict group — meaning
// `cn("text-white", "text-button")` would silently drop `text-white`,
// since both look like "the text-color class" to it. Registering our scale
// under the `font-size` group keeps size and color classes independent.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["display", "h1", "h2", "h3", "bodyl", "bodym", "bodys", "caption", "button", "overline"],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
