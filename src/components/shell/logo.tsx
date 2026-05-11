"use client"

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 22, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2" y="2" width="28" height="28" rx="6.5" fill="#D13A1F" />
      <path
        d="M8 14 L13 19 L16 14 L19 19 L24 14"
        stroke="#EFEAE0"
        strokeWidth="2.2"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      <circle cx="16" cy="16" r="1.7" fill="#EFEAE0" />
    </svg>
  )
}
