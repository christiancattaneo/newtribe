import { SVGProps } from 'react';

export function CelticKnot(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="blueYellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#4A90E2' }} />
          <stop offset="100%" style={{ stopColor: '#F5D76E' }} />
        </linearGradient>
      </defs>
      <path
        d="M50 10 C60 10 70 20 70 30 C70 40 60 50 50 50
           C40 50 30 40 30 30 C30 20 40 10 50 10
           M50 90 C40 90 30 80 30 70 C30 60 40 50 50 50
           C60 50 70 60 70 70 C70 80 60 90 50 90
           M10 50 C10 40 20 30 30 30 C40 30 50 40 50 50
           C50 60 40 70 30 70 C20 70 10 60 10 50
           M90 50 C90 60 80 70 70 70 C60 70 50 60 50 50
           C50 40 60 30 70 30 C80 30 90 40 90 50"
        stroke="url(#blueYellow)"
        strokeWidth="4"
        fill="none"
      />
    </svg>
  );
} 