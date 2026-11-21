/** Line icons drawn for the app (24×24, stroke = currentColor). */

const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  write: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  comments: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12zM8 11h8M8 14.5h5',
  media: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4L15 12l5 5M15.5 9a1 1 0 1 0 0-.01',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  shop: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  image: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4L15 12l5 5',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  globe:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18',
  admin: 'M4 4h16v16H4zM4 9h16M9 9v11',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.01',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6 6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  reply: 'M10 8 5 12l5 4M5 12h9a5 5 0 0 1 5 5v1',
  spam: 'M12 3l9 16H3zM12 10v4M12 17v.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  key: 'M14 10a4 4 0 1 0-1.2 2.8L20 20M17 17l2-2',
  sites: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  phone:
    'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  drafts: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 24,
  className,
  strokeWidth = 1.9,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
