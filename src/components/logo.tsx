import type { SVGProps } from "react";

export default function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 640 640"
      stroke="currentColor"
      fill="currentColor"
      focusable="false"
      {...props}
    >
      <path d="m260,575c-68.11,0-132.15-26.52-180.31-74.69S5,388.11,5,320s26.52-132.15,74.69-180.31,112.2-74.69,180.31-74.69c93.6,0,179.52,51.14,224.23,133.48,1.76,3.24,6.43,11.84,8.41,21.14,2.17,10.19,1.12,19.9.16,24.03-6.08,26.1-29.81,52.89-65.77,74.69,43.57,11.56,67.88,24.05,77.19,39.23,4.41,7.19,5.64,15.07,3.59,22.82-13.25,54.54-44.84,103.95-88.98,139.13-22.09,17.61-46.73,31.32-73.24,40.76-27.42,9.77-56.22,14.72-85.58,14.72Zm0-480c-60.1,0-116.6,23.4-159.1,65.9-42.5,42.5-65.9,99-65.9,159.1s23.4,116.6,65.9,159.1c42.5,42.5,99,65.9,159.1,65.9,51.49,0,99.95-16.93,140.12-48.95,26.01-20.73,47.08-47.04,61.69-76.55-7.49,2.53-15.82,4.67-24.97,6.39-36.58,6.89-82.18,5.87-121.98-2.72-60.21-12.99-89.37-37.89-103.23-56.49-3.29-4.41-3.9-10.27-1.58-15.27,2.31-4.99,7.17-8.32,12.67-8.67,90.5-5.71,147.24-27.31,178.91-44.43,26.34-14.24,56.45-37.87,61.95-61.47.26-1.27.7-6.34-.28-10.98-1.08-5.06-4.24-10.88-5.43-13.07-39.46-72.66-115.27-117.79-197.87-117.79Z"></path>
      <circle cx="158.12" cy="292.8" r="30.1"></circle>
      <g>
        <path d="m618.52,309.92h-64.07c-8.28,0-15,6.72-15,15s6.72,15,15,15h64.07c8.28,0,15-6.72,15-15s-6.72-15-15-15Z"></path>
        <path d="m603.52,421.28l-55.49-46.24c-6.36-5.3-15.82-4.44-21.13,1.92s-4.44,15.82,1.92,21.13l55.49,46.24c2.8,2.34,6.21,3.48,9.59,3.48,4.3,0,8.56-1.84,11.53-5.4,5.3-6.36,4.44-15.82-1.92-21.13Z"></path>
        <path d="m538.44,278.27c3.39,0,6.79-1.14,9.59-3.48l55.49-46.24c6.36-5.3,7.22-14.76,1.92-21.13-5.3-6.36-14.76-7.22-21.13-1.92l-55.49,46.24c-6.36,5.3-7.22,14.76-1.92,21.13,2.97,3.56,7.23,5.4,11.53,5.4Z"></path>
      </g>
    </svg>
  );
}

export function AnimatedLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 640 640"
      fill="currentColor"
      {...props}
    >
      <g>
        <path d="m260,575c-68.11,0-132.15-26.52-180.31-74.69S5,388.11,5,320s26.52-132.15,74.69-180.31,112.2-74.69,180.31-74.69c93.6,0,179.52,51.14,224.23,133.48,1.76,3.24,6.43,11.84,8.41,21.14,2.17,10.19,1.12,19.9.16,24.03-6.08,26.1-29.81,52.89-65.77,74.69,43.57,11.56,67.88,24.05,77.19,39.23,4.41,7.19,5.64,15.07,3.59,22.82-13.25,54.54-44.84,103.95-88.98,139.13-22.09,17.61-46.73,31.32-73.24,40.76-27.42,9.77-56.22,14.72-85.58,14.72Zm0-480c-60.1,0-116.6,23.4-159.1,65.9-42.5,42.5-65.9,99-65.9,159.1s23.4,116.6,65.9,159.1c42.5,42.5,99,65.9,159.1,65.9,51.49,0,99.95-16.93,140.12-48.95,26.01-20.73,47.08-47.04,61.69-76.55-7.49,2.53-15.82,4.67-24.97,6.39-36.58,6.89-82.18,5.87-121.98-2.72-60.21-12.99-89.37-37.89-103.23-56.49-3.29-4.41-3.9-10.27-1.58-15.27,2.31-4.99,7.17-8.32,12.67-8.67,90.5-5.71,147.24-27.31,178.91-44.43,26.34-14.24,56.45-37.87,61.95-61.47.26-1.27.7-6.34-.28-10.98-1.08-5.06-4.24-10.88-5.43-13.07-39.46-72.66-115.27-117.79-197.87-117.79Z">
          <animate
            attributeName="d"
            dur="1s"
            repeatCount="indefinite"
            begin="0s"
            from="m260,575c-68.11,0-132.15-26.52-180.31-74.69S5,388.11,5,320s26.52-132.15,74.69-180.31,112.2-74.69,180.31-74.69c93.6,0,179.52,51.14,224.23,133.48,1.76,3.24,6.43,11.84,8.41,21.14,2.17,10.19,1.12,19.9.16,24.03-6.08,26.1-29.81,52.89-65.77,74.69,43.57,11.56,67.88,24.05,77.19,39.23,4.41,7.19,5.64,15.07,3.59,22.82-13.25,54.54-44.84,103.95-88.98,139.13-22.09,17.61-46.73,31.32-73.24,40.76-27.42,9.77-56.22,14.72-85.58,14.72Zm0-480c-60.1,0-116.6,23.4-159.1,65.9-42.5,42.5-65.9,99-65.9,159.1s23.4,116.6,65.9,159.1c42.5,42.5,99,65.9,159.1,65.9,51.49,0,99.95-16.93,140.12-48.95,26.01-20.73,47.08-47.04,61.69-76.55-7.49,2.53-15.82,4.67-24.97,6.39-36.58,6.89-82.18,5.87-121.98-2.72-60.21-12.99-89.37-37.89-103.23-56.49-3.29-4.41-3.9-10.27-1.58-15.27,2.31-4.99,7.17-8.32,12.67-8.67,90.5-5.71,147.24-27.31,178.91-44.43,26.34-14.24,56.45-37.87,61.95-61.47.26-1.27.7-6.34-.28-10.98-1.08-5.06-4.24-10.88-5.43-13.07-39.46-72.66-115.27-117.79-197.87-117.79Z"
            to="m506.31,318.23c6.21-12.87,7.13-29.68,4.76-43.02-10.32-58.24-41.01-111.48-86.39-149.91-45.93-38.89-104.42-60.3-164.68-60.3-68.11,0-132.15,26.52-180.31,74.69C31.52,187.85,5,251.89,5,320s26.52,132.15,74.69,180.31c48.16,48.16,112.2,74.69,180.31,74.69,60.56,0,119.27-21.6,165.3-60.83,45.51-38.78,76.08-92.43,86.06-151.06,3.52-20.67-.26-35.31-5.06-44.88Zm-24.52,39.84c-8.81,51.71-35.78,99.04-75.95,133.26-40.61,34.61-92.41,53.67-145.85,53.67-60.1,0-116.6-23.4-159.1-65.9-42.5-42.5-65.9-99-65.9-159.1s23.4-116.6,65.9-159.1c42.5-42.5,99-65.9,159.1-65.9,53.18,0,104.78,18.89,145.3,53.2,40.06,33.92,67.13,80.88,76.24,132.25,2.04,11.48-.3,23.36-3.69,27.05-22.09,20.49-62.89,35.06-115.01,41.03-46.35,5.31-97.15,3.27-135.88-5.45-8.08-1.82-16.11,3.25-17.93,11.34-1.82,8.08,3.25,16.11,11.34,17.93,25.38,5.72,57.22,9.04,90.71,9.04,61.53,0,128.6-11.24,171.27-39.5.59,4.86.43,10.36-.56,16.18Z"
          />
        </path>
        <circle cx="158" cy="292" r="30" />
        <path d="m603.52,421.28l-55.49-46.24c-6.36-5.3-15.82-4.44-21.13,1.92s-4.44,15.82,1.92,21.13l55.49,46.24c2.8,2.34,6.21,3.48,9.59,3.48,4.3,0,8.56-1.84,11.53-5.4,5.3-6.36,4.44-15.82-1.92-21.13Z">
          <animate
            attributeName="visibility"
            dur="1s"
            repeatCount="indefinite"
            begin="0s"
            from="visible"
            to="hidden"
          />
        </path>
        <path d="m618.52,309.92h-64.07c-8.28,0-15,6.72-15,15s6.72,15,15,15h64.07c8.28,0,15-6.72,15-15s-6.72-15-15-15Z">
          <animate
            attributeName="visibility"
            dur="1s"
            repeatCount="indefinite"
            begin="0s"
            from="visible"
            to="hidden"
          />
        </path>
        <path d="m538.44,278.27c3.39,0,6.79-1.14,9.59-3.48l55.49-46.24c6.36-5.3,7.22-14.76,1.92-21.13-5.3-6.36-14.76-7.22-21.13-1.92l-55.49,46.24c-6.36,5.3-7.22,14.76-1.92,21.13,2.97,3.56,7.23,5.4,11.53,5.4Z">
          <animate
            attributeName="visibility"
            dur="1s"
            repeatCount="indefinite"
            begin="0s"
            from="visible"
            to="hidden"
          />
        </path>
      </g>
    </svg>
  );
}
