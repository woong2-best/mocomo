"use client";

import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  fadeUp,
  inViewItem,
  matchBurst,
  MOTION_REVEAL_EAGER,
  MOTION_REVEAL_MAX,
  pageVariants,
  pressTap,
  scaleIn,
  sheetBackdrop,
  sheetPanel,
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
  skip = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** true면 옵저버 없이 즉시 렌더 (긴 목록 성능) */
  skip?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced || skip) {
    return (
      <div className={cn(className, skip && "moco-content-auto")}>{children}</div>
    );
  }
  return (
    <motion.div
      className={className}
      variants={inViewItem}
      initial="hidden"
      animate="show"
      whileInView="show"
      viewport={{ once: true, amount: 0.05, margin: "0px 0px -32px 0px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/** index 기준 reveal 상한 적용 */
export function MotionInViewIndexed({
  index,
  children,
  className,
  delayStep = 0.04,
  maxDelay = 0.35,
}: {
  index: number;
  children: React.ReactNode;
  className?: string;
  delayStep?: number;
  maxDelay?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const skip = index >= MOTION_REVEAL_MAX;
  const eager = index < MOTION_REVEAL_EAGER;
  const delay = Math.min(index * delayStep, maxDelay);

  if (reduced || skip) {
    return (
      <div className={cn(className, skip && "moco-content-auto")}>{children}</div>
    );
  }

  if (eager) {
    return (
      <motion.div
        className={className}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        transition={{ delay }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <MotionInView className={className} delay={delay} skip={false}>
      {children}
    </MotionInView>
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

/** 바텀 시트 — 백드롭 + 패널 */
export function MotionSheet({
  open,
  onClose,
  children,
  panelClassName,
  className,
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  panelClassName?: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced && !open) return null;
  if (reduced && open) {
    return (
      <div className={cn("pointer-events-auto absolute inset-0 z-[200] flex flex-col justify-end", className)}>
        <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
        <div className={panelClassName}>{children}</div>
      </div>
    );
  }
  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn("pointer-events-auto absolute inset-0 z-[200] flex flex-col justify-end", className)}
          role="dialog"
          aria-modal="true"
          aria-hidden={!open}
        >
          <motion.div
            className="absolute inset-0 bg-black/40"
            variants={sheetBackdrop}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            className={panelClassName}
            variants={sheetPanel}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** 필터 칩 — 활성 pill 슬라이드 */
export function MotionChip({
  active,
  onClick,
  label,
  layoutId = "motion-chip-pill",
  className,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  layoutId?: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-full px-3 py-1 text-xs font-semibold transition-colors",
        active ? "text-white" : "text-muted-foreground hover:bg-muted",
        className
      )}
    >
      {active && !reduced && (
        <motion.span
          layoutId={layoutId}
          className="pointer-events-none absolute inset-0 rounded-full bg-folk-terracotta"
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
        />
      )}
      {active && reduced && (
        <span className="absolute inset-0 rounded-full bg-folk-terracotta" />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}

/** 매칭·축하 모달 등 */
export function MotionBurst({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      onClick={onClick}
      variants={matchBurst}
      initial={reduced ? false : "hidden"}
      animate="show"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
