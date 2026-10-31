"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { markStep } from "./stepScroll.ts";

/** A link to another chapter: a plain click notes the step, so the new chapter starts at the top. */
export function StepLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) markStep();
      }}
    />
  );
}
