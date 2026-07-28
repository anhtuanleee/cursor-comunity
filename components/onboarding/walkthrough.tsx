"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cursor-community:walkthrough";
const TOUR_VERSION = "2";

type Step = {
  title: string;
  body: string;
  target?: string;
  actions?: string[];
};

const STEPS: Step[] = [
  {
    title: "Welcome to Cursor Community",
    body: "A living collection of creative work. Save references, react together, and follow the activity in real time.",
  },
  {
    title: "Explore by discipline",
    body: "Use these filters to narrow the gallery without leaving the page.",
    target: '[data-tour="filters"]',
  },
  {
    title: "Open a reference",
    body: "Click a reference to open its immersive viewer. The URL stays shareable, while your gallery context remains in place.",
    target: '[data-tour="reference-card"]',
    actions: ["Click to open", "View image in detail", "Visit original source"],
  },
  {
    title: "React to a detail",
    body: "Use reactions to leave a fast signal for the room: love it, mark it useful, or raise a question.",
    target: '[data-tour="reaction-action"]',
    actions: ["Love", "Useful", "Question"],
  },
  {
    title: "Bring everyone into focus",
    body: "Focus pins the selected reference for everyone currently in the room. Tap it again to end the focus.",
    target: '[data-tour="focus-action"]',
    actions: ["Start focus", "End focus"],
  },
  {
    title: "Leave an annotation",
    body: "Open comments to capture a thought, reply to another person, and keep the discussion tied to the reference.",
    target: '[data-tour="comment-action"]',
    actions: ["Comment", "Reply"],
  },
  {
    title: "Save it for the room",
    body: "Shortlist creates a shared decision trail. Move a reference between Maybe, Keep, and Reject together.",
    target: '[data-tour="shortlist-action"]',
    actions: ["Maybe", "Keep", "Reject"],
  },
  {
    title: "Talk from your cursor",
    body: "Click this launcher or press / anywhere on the gallery to open a lightweight chat composer beside your cursor. Your message keeps your cursor color so the room knows it is you.",
    target: '[data-tour="chat-action"]',
    actions: ["Press /", "Enter to send", "Esc to close"],
  },
  {
    title: "Build a shared shortlist",
    body: "Collect promising work in a collaborative board and move it from Maybe to Keep or Reject.",
    target: '[data-tour="shortlist"]',
  },
];

function findTarget(step: Step): HTMLElement | null {
  if (!step.target) return null;
  return document.querySelector<HTMLElement>(step.target);
}

export function Walkthrough() {
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const step = stepIndex === null ? null : STEPS[stepIndex];

  const complete = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, TOUR_VERSION);
    setStepIndex(null);
  }, []);

  const moveTo = useCallback((direction: 1 | -1) => {
    setStepIndex(current => {
      if (current === null) return null;
      let next = current + direction;
      while (next >= 0 && next < STEPS.length) {
        if (!STEPS[next].target || findTarget(STEPS[next])) return next;
        next += direction;
      }
      return direction > 0 ? null : current;
    });
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === TOUR_VERSION) return;
    const frame = window.requestAnimationFrame(() => setStepIndex(0));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("walkthrough-active", stepIndex !== null);
    return () => root.classList.remove("walkthrough-active");
  }, [stepIndex]);

  useEffect(() => {
    if (!step) return;
    const updateRect = () => {
      const target = findTarget(step);
      setTargetRect(target?.getBoundingClientRect() ?? null);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [step]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") complete();
      if (event.key === "ArrowRight") moveTo(1);
      if (event.key === "ArrowLeft") moveTo(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [complete, moveTo]);

  if (!step || stepIndex === null) return null;
  const isLast = stepIndex === STEPS.length - 1;
  const cardStyle = targetRect
    ? {
        left: `${Math.min(Math.max(targetRect.left, 16), window.innerWidth - 336)}px`,
        top: `${Math.min(targetRect.bottom + 16, window.innerHeight - 220)}px`,
      }
    : undefined;

  return (
    <div data-walkthrough className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Product tour">
      <div className="absolute inset-0 bg-black/45" />
      {targetRect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-[0.75rem] ring-[0.125rem] ring-white ring-offset-[0.25rem] ring-offset-black/40 transition-all duration-300"
          style={{ left: targetRect.left, top: targetRect.top, width: targetRect.width, height: targetRect.height }}
        />
      ) : null}
      <section
        className={`absolute w-[min(21rem,calc(100vw-2rem))] rounded-[0.75rem] border border-black/10 bg-white p-5 shadow-[0_1.25rem_3rem_rgba(0,0,0,0.2)] ${targetRect ? "" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"}`}
        style={cardStyle}
      >
        <p className="text-caption text-text-secondary">{stepIndex + 1} / {STEPS.length}</p>
        <h2 className="mt-1 text-h1 text-primary">{step.title}</h2>
        <p className="mt-2 text-body text-text-secondary">{step.body}</p>
        {step.actions?.length ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {step.actions.map(action => (
              <span key={action} className="rounded-full bg-bg-secondary px-2.5 py-1 text-caption text-text-secondary">
                {action}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={complete} className="text-button text-text-secondary hover:text-black">Skip tour</button>
          <div className="flex gap-2">
            {stepIndex > 0 ? <button type="button" onClick={() => moveTo(-1)} className="h-8 rounded-full bg-bg-secondary px-3 text-button">Back</button> : null}
            <button type="button" onClick={() => isLast ? complete() : moveTo(1)} className="h-8 rounded-full bg-primary px-3 text-button text-white">{isLast ? "Done" : "Next"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
