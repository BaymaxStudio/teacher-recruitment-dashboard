"use client";

import { useCallback, useRef, useState } from "react";
import { useDismiss } from "../hooks";
import { Icon } from "./Icon";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  onProfile: () => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
  onExportCsv: () => void;
  onCopyTodo: () => void;
};

export function TopBar({ query, onQuery, onProfile, onBackup, onRestore, onExportCsv, onCopyTodo }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDismiss(menuRef, menuOpen, closeMenu);

  const run = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  return (
    <header className="topbar">
      <a className="skip-link" href="#main">跳到正文</a>
      <div className="topbar-in">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">师</span>
          <span className="brand-text">
            <strong>十四城中学教师招聘决策台</strong>
            <small>V2 · 公开研究版</small>
          </span>
        </div>

        <label className="global-search">
          <span className="sr-only">搜索学校、岗位或要求</span>
          <Icon name="search" size={16} />
          <input type="search" value={query} onChange={(event) => onQuery(event.target.value)}
            placeholder="搜索学校、岗位或要求，例如：政治、万科梅沙" autoComplete="off" />
        </label>

        <div className="topbar-actions">
          <button type="button" className="button button-ghost" onClick={onProfile}>
            <Icon name="user" size={16} /><span>我的资料</span>
          </button>
          <details ref={menuRef} className="menu" open={menuOpen} onToggle={(event) => setMenuOpen(event.currentTarget.open)}>
            <summary className="icon-button" aria-label="更多操作"><Icon name="more" /></summary>
            <div className="menu-panel">
              <button type="button" onClick={run(onExportCsv)}>导出当前筛选为 CSV</button>
              <button type="button" onClick={run(onCopyTodo)}>复制为投递待办</button>
              <hr />
              <button type="button" onClick={run(onBackup)}>备份本地数据</button>
              <button type="button" onClick={() => { setMenuOpen(false); fileRef.current?.click(); }}>从备份恢复</button>
            </div>
          </details>
          <input ref={fileRef} hidden type="file" accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onRestore(file);
              event.target.value = "";
            }} />
        </div>
      </div>
    </header>
  );
}
