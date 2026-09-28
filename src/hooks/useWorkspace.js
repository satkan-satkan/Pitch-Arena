import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
export default function useWorkspace() {
  const [account, setAccount] = useState(null),
    [projects, setProjects] = useState([]),
    [history, setHistory] = useState([]),
    [draft, setDraft] = useState(null),
    [aiReady, setAiReady] = useState(false),
    [online, setOnline] = useState(false),
    [checking, setChecking] = useState(true),
    [activeProjectId, setActiveProjectId] = useState("");
  const latestRequest = useRef(0);
  const refresh = async () => {
    const request = ++latestRequest.current;
    let r;
    try {
      r = await api("/bootstrap");
    } catch (error) {
      if (request === latestRequest.current) {
        setOnline(false);
        setChecking(false);
      }
      throw error;
    }
    if (request !== latestRequest.current) return r;
    setAccount(r.user);
    setProjects(r.projects);
    setHistory(r.history);
    setDraft(r.draft);
    setAiReady(r.aiReady);
    setOnline(true);
    setChecking(false);
    setActiveProjectId((current) =>
      r.projects.some((p) => p.id === current)
        ? current
        : r.projects[0]?.id || "",
    );
    return r;
  };
  useEffect(() => {
    refresh().catch(() => {});
  }, []);
  return {
    account,
    setAccount,
    projects,
    history,
    setHistory,
    draft,
    setDraft,
    aiReady,
    online,
    checking,
    activeProjectId,
    setActiveProjectId,
    refresh,
  };
}
