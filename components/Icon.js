export default function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const p = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></>,
    chart: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 5-6"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    newspaper: <><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></>,
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7z"/>,
    report: <><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h4M8 13h8M8 17h6"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
    calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7 3v4M17 3v4M3.5 10h17"/></>,
    football: <><path d="M7 4.5 12 3l5 1.5 3 4.5-2 6-6 4-6-4-2-6z"/><path d="m9.5 8 2.5-1.5L14.5 8l-.8 3h-3.4z"/></>,
    wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 8h15M15 12h4v4h-4a2 2 0 0 1 0-4z"/></>,
    shield: <><path d="M12 3 20 6v6c0 5-3.2 8-8 9-4.8-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/></>,
  }; return <svg {...common}>{p[name] || p.chart}</svg>;
}