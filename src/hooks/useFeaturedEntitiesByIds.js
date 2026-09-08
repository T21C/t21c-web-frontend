import { useEffect, useMemo, useState } from "react";
import api from "@/utils/api";
import { fetchLevelsByIds, fetchPassesByIds } from "@/utils/featuredEntitySearch";

function useIdList(ids) {
  const key = Array.isArray(ids) ? ids.join(",") : "";
  const list = useMemo(() => {
    if (!key) return [];
    return key
      .split(",")
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);
  }, [key]);
  return { key, list };
}

function useEntitiesByIds(ids, kind) {
  const { key, list } = useIdList(ids);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!key) {
      setRows([]);
      setStatus("idle");
      return undefined;
    }
    const controller = new AbortController();
    const fetchRows = kind === "pass" ? fetchPassesByIds : fetchLevelsByIds;
    setStatus("loading");
    fetchRows(list, { signal: controller.signal })
      .then((next) => {
        if (controller.signal.aborted) return;
        setRows(next);
        setStatus("done");
      })
      .catch((error) => {
        if (api.isCancel(error) || controller.signal.aborted) return;
        setRows([]);
        setStatus("done");
      });
    return () => {
      controller.abort();
    };
  }, [key, kind, list]);

  const byId = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );
  const loading = status === "loading" || (list.length > 0 && status === "idle");
  return { rows, byId, loading };
}

export function useLevelsByIds(ids) {
  return useEntitiesByIds(ids, "level");
}

export function usePassesByIds(ids) {
  return useEntitiesByIds(ids, "pass");
}
