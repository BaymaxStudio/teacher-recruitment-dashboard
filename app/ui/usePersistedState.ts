"use client";

import { useEffect, useState } from "react";
import type { CandidateProfile } from "../recruitment-data";
import { loadStorageState, saveStorageState, STORAGE_SCHEMA_VERSION } from "../../lib/storage";
import { downloadText } from "./derive";

export type FollowupStatus = "未开始" | "准备材料" | "已投递" | "笔试/面试" | "已放弃";
export const FOLLOWUP_OPTIONS: FollowupStatus[] = ["未开始", "准备材料", "已投递", "笔试/面试", "已放弃"];

export function defaultProfile(): CandidateProfile {
  return {
    graduationYear: 2027,
    teacherCertificateStage: "中学未确认",
    teacherCertificateSubject: "政治",
    minimumSalaryAnnual: 15,
    housingPreference: "优先提供住宿",
  };
}

// 收藏、备注、跟进、城市备注和个人资料只存在本机浏览器；格式沿用 lib/storage.ts 的 v2
export function usePersistedState() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [followups, setFollowups] = useState<Record<string, FollowupStatus>>({});
  const [cityNotes, setCityNotes] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<CandidateProfile>(defaultProfile);
  const [storageReady, setStorageReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = loadStorageState();
      if (loaded.ok) {
        setFavorites(loaded.state.favorites);
        setNotes(loaded.state.notes);
        setFollowups(loaded.state.followups as Record<string, FollowupStatus>);
        setCityNotes(loaded.state.cityNotes ?? {});
        setProfile({ ...defaultProfile(), ...(loaded.state.candidateProfile ?? {}) });
        if (loaded.warnings.length) setNotice(loaded.warnings.join("；"));
      } else {
        setStorageBlocked(true);
        setNotice(loaded.message);
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady || storageBlocked) return;
    const saved = saveStorageState({ schemaVersion: STORAGE_SCHEMA_VERSION, favorites, notes, followups, cityNotes, candidateProfile: profile });
    if (!saved) {
      const timer = window.setTimeout(() => {
        setStorageBlocked(true);
        setNotice("浏览器拒绝写入本地数据；本次会话仍可使用，但刷新后不会保留。");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [favorites, notes, followups, cityNotes, profile, storageReady, storageBlocked]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const setFollowup = (id: string, value: FollowupStatus) => setFollowups((current) => ({ ...current, [id]: value }));
  const setNote = (id: string, value: string) => setNotes((current) => ({ ...current, [id]: value }));
  const setCityNote = (city: string, value: string) => setCityNotes((current) => ({ ...current, [city]: value }));

  const backup = () => {
    downloadText("十四城决策台_本地备份.json", JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION, favorites, notes, followups, cityNotes, candidateProfile: profile }, null, 2), "application/json");
  };

  const restore = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.favorites) || typeof data.notes !== "object" || typeof data.followups !== "object") throw new Error("格式不兼容");
        setFavorites(data.favorites.filter((id: unknown) => typeof id === "string"));
        setNotes(data.notes);
        setFollowups(data.followups);
        setCityNotes(data.cityNotes ?? {});
        setProfile({ ...defaultProfile(), ...(data.candidateProfile ?? {}) });
        setNotice("备份已恢复到当前浏览器。");
      } catch {
        setNotice("备份文件无法识别，未修改现有数据。");
      }
    };
    reader.readAsText(file);
  };

  return {
    favorites, notes, followups, cityNotes, profile, notice,
    setProfile, setNotice, toggleFavorite, setFollowup, setNote, setCityNote, backup, restore,
  };
}

export type PersistedApi = ReturnType<typeof usePersistedState>;
