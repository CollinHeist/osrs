import { useState, useEffect } from "react";

const STORAGE_KEY = "slayer.tasks.v1";

function loadTasks() {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function useSlayerTasks() {
  const [tasks, setTasks] = useState(loadTasks);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  function addTask(data) {
    const task = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [task, ...prev]);
    return task;
  }

  function updateTask(id, changes) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...changes } : t))
    );
  }

  function deleteTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  /**
   * @param {object[]} incoming Parsed tasks from a JSON file.
   * @param {"replace" | "merge"} mode
   */
  function importTasks(incoming, mode) {
    if (mode === "replace") {
      setTasks(incoming);
    } else {
      setTasks((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const toAdd = incoming.map((t) =>
          existingIds.has(t.id) ? { ...t, id: crypto.randomUUID() } : t
        );
        return [...prev, ...toAdd];
      });
    }
  }

  return { tasks, addTask, updateTask, deleteTask, importTasks };
}
