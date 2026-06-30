"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  fadeUp,
  inViewItem,
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
  hoverLift = true,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  hoverLift?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      className={cn(className)}
      whileTap={reduced || disabled ? undefined : pressTap}
      whileHover={
        reduced || disabled || !hoverLift ? undefined : { scale: 1.02, y: -2 }
      }
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}

/** 스크롤 뷰포트 진입 시 등장 */
export function MotionInView({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      variants={inViewItem}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -40px 0px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/** 좋아요·별 등 토글 시 팝 */
export function MotionPop({
  children,
  trigger,
  className,
}: {
  children: React.ReactNode;
  trigger: boolean | number | string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    return <span className={className}>{children}</span>;
  }
  return (
    <motion.span
      key={String(trigger)}
      className={className}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.4, 1] }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.span>
  );
}
