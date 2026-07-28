"use client";

interface IconProps {
  size?: number | string;
  className?: string;
}

function iconSize(size: number | string) {
  return typeof size === "number" ? `${size / 16}rem` : size;
}

export function EyeIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={iconSize(size)}
      height={iconSize(size)}
      viewBox="0 0 18 18"
      fill="none"
      className={className}
    >
      <path
        d="M1.5 9s2.6-4.5 7.5-4.5S16.5 9 16.5 9 13.9 13.5 9 13.5 1.5 9 1.5 9Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

export function LinkIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={iconSize(size)}
      height={iconSize(size)}
      viewBox="0 0 18 18"
      fill="none"
      className={className}
    >
      <path
        d="m7.3 10.7-1.1 1.1a2.55 2.55 0 1 1-3.6-3.6l2.2-2.2a2.55 2.55 0 0 1 3.6 0"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="m10.7 7.3 1.1-1.1a2.55 2.55 0 1 1 3.6 3.6l-2.2 2.2a2.55 2.55 0 0 1-3.6 0"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="m6.5 9.5 5-1"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CommentIcon({ size = 15, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={iconSize(size)}
      height={iconSize(size)}
      viewBox="0 0 18 18"
      fill="none"
      className={className}
    >
      <path
        d="M3.25 3.25h11.5v8.2H8.2l-3.25 2.3v-2.3h-1.7v-8.2Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M6 6.5h6M6 9h4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HeartIcon({ size = 16, className }: IconProps) {
  return (
    <svg aria-hidden="true" width={iconSize(size)} height={iconSize(size)} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M9 15.1 3.2 9.5C-.1 6.2 4.7 1.2 8 4.5L9 5.6l1-1.1c3.3-3.3 8.1 1.7 4.8 5L9 15.1Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    </svg>
  );
}

export function UsefulIcon({ size = 16, className }: IconProps) {
  return (
    <svg aria-hidden="true" width={iconSize(size)} height={iconSize(size)} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M6.4 8.2V15h6.4l2-5.4a1.2 1.2 0 0 0-1.1-1.6h-3l.5-3.2A1.6 1.6 0 0 0 9.6 3L6.4 8.2Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M3.2 8.2h3.2V15H3.2V8.2Z" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

export function QuestionIcon({ size = 16, className }: IconProps) {
  return (
    <svg aria-hidden="true" width={iconSize(size)} height={iconSize(size)} viewBox="0 0 18 18" fill="none" className={className}>
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.35" />
      <path d="M7.2 7.1A1.9 1.9 0 0 1 9.1 5.4c1.2 0 2.1.7 2.1 1.8 0 1.4-1.5 1.7-2 2.7M9.1 12.6h.01" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export function FocusIcon({ size = 16, className }: IconProps) {
  return (
    <svg aria-hidden="true" width={iconSize(size)} height={iconSize(size)} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M6.2 2.5H3.8c-.7 0-1.3.6-1.3 1.3v2.4M11.8 2.5h2.4c.7 0 1.3.6 1.3 1.3v2.4M15.5 11.8v2.4c0 .7-.6 1.3-1.3 1.3h-2.4M6.2 15.5H3.8c-.7 0-1.3-.6-1.3-1.3v-2.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

export function BoardIcon({ size = 16, className }: IconProps) {
  return (
    <svg aria-hidden="true" width={iconSize(size)} height={iconSize(size)} viewBox="0 0 18 18" fill="none" className={className}>
      <rect x="2.3" y="2.3" width="13.4" height="13.4" rx="1.7" stroke="currentColor" strokeWidth="1.35" />
      <path d="M6.7 2.5v13M11.3 2.5v13" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg aria-hidden="true" width={iconSize(size)} height={iconSize(size)} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="m4 4 10 10M14 4 4 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
