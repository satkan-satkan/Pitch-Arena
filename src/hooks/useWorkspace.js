import { useEffect, useState } from "react";
import { api } from "../services/api";
export default function useWorkspace() {
  const [account, setAccount] = useState(null),
    [projects, setProjects] = useState([]),
    [history, setHistory] = useState([]),
    [draft, setDraft] = useState(null),
    [aiReady, setAiReady] = useState(false),
    [online, setOnline] = useState(false),
    [activeProjectId, setActiveProjectId] = useState("");
  const refresh = async () => {
    const r = await api("/bootstrap");
    setAccount(r.user);
    setProjects(r.projects);
    setHistory(r.history);
    setDraft(r.draft);
    setAiReady(r.aiReady);
    setOnline(true);
    setActiveProjectId((current) =>
      r.projects.some((p) => p.id === current)
        ? current
        : r.projects[0]?.id || "",
    );
    return r;
  };
  useEffect(() => {
    refresh().catch(() => setOnline(false));
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
    activeProjectId,
    setActiveProjectId,
    refresh,
  };
}
