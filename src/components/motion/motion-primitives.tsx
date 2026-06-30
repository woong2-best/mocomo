"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  fadeUp,
  pageVariants,
  pressTap,
  scaleIn,
  staggerContainer,
  staggerItem,
} from "@/lib/motion-presets";
import { cn } from "@/lib/utils";

type MotionDivProps = HTMLMotionProps<"div">;

function motionProps(reduced: boolean, animate: MotionDivProps) {
  if (reduced) {
    return { initial: false, animate: undefined, exit: undefined, transition: { duration: 0 } };
  }
  return animate;
}

export function MotionPage({
  children,
  className,
  ...props
}: MotionDivProps & { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      variants={pageVariants}
      {...motionProps(reduced, {
        initial: "hidden",
        animate: "show",
        exit: "exit",
      })}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function MotionStagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "section";
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      {...motionProps(reduced, { initial: "hidden", animate: "show" })}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      variants={staggerItem}
      {...motionProps(reduced, { initial: "hidden", animate: "show" })}
    >
      {children}
    </motion.div>
  );
}

export function MotionFade({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      {...motionProps(reduced, {
        initial: "hidden",
        animate: "show",
        transition: { delay },
      })}
    >
      {children}
    </motion.div>
  );
}

export function MotionScaleIn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      variants={scaleIn}
      {...motionProps(reduced, { initial: "hidden", animate: "show" })}
    >
      {children}
    </motion.div>
  );
}

export function MotionPress({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      className={cn(className)}
      whileTap={reduced || disabled ? undefined : pressTap}
      whileHover={reduced || disabled ? undefined : { scale: 1.02 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}
