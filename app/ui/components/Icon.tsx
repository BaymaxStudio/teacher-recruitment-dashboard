// 线条图标：24 网格、描边随文字颜色
const PATHS = {
  close: "M18 6 6 18M6 6l12 12",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20",
  star: "m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8L12 3.8z",
  compare: "M4 6h7v13H4zM13 6h7v13h-7z",
  filter: "M4 6h16M7 12h10M10 18h4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0",
  external: "M14 5h5v5M19 5l-8 8M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10",
  chevron: "m9 6 6 6-6 6",
  back: "M15 18l-6-6 6-6",
  check: "m5 12.5 4.5 4.5L19 7.5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2",
  home: "M4 11 12 4l8 7M6.5 9.5V20h11V9.5",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5 12 13l2.5-3.5M9 13.5h6M12 13v4",
  doc: "M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 6.5 20V4a.5.5 0 0 1 .5-.5zM14 3.5V8h4M9 12h6M9 15.5h6",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
