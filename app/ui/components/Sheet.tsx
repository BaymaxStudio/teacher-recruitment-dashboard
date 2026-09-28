"use client";

import { useRef, type ReactNode } from "react";
import { useModal } from "../hooks";
import { Icon } from "./Icon";

type Props = {
  label: string;
  side?: "right" | "left" | "center";
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
};

// 模态层：右侧抽屉、左侧抽屉或居中面板；窄屏一律全屏
export function Sheet({ label, side = "right", wide = false, onClose, children }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  useModal(ref, true, onClose);
  return (
    <div className={`sheet-layer sheet-${side}`}>
      <button type="button" className="sheet-scrim" aria-label="关闭" tabIndex={-1} onClick={onClose} />
      <section ref={ref} className={`sheet${wide ? " sheet-wide" : ""}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <button type="button" className="icon-button sheet-close" onClick={onClose} aria-label={`关闭${label}`}>
          <Icon name="close" />
        </button>
        {children}
      </section>
    </div>
  );
}
