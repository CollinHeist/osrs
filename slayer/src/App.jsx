import { useMemo, useState } from "react";
import "./App.css";
import { useGameData } from "./hooks/useGameData.js";
import { useSlayerTasks } from "./hooks/useSlayerTasks.js";
import { computeTaskMetrics, getTaskRecommendation } from "./lib/analytics.js";
import { StatsBanner } from "./components/StatsBanner.jsx";
import { TaskList } from "./components/TaskList.jsx";
import { TaskDetail } from "./components/TaskDetail.jsx";
import { TaskForm } from "./components/TaskForm.jsx";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard.jsx";
import { XpGpScatterChart } from "./components/XpGpScatterChart.jsx";
import { ImportExport } from "./components/ImportExport.jsx";

const TABS = [
  { id: "tasks", label: "Tasks" },
  { id: "analytics", label: "Analytics" },
];

export default function App() {
  const gameData = useGameData();
  const { tasks, addTask, updateTask, deleteTask, importTasks } = useSlayerTasks();

  const [tab, setTab] = useState("tasks");
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const enrichedTasks = useMemo(() => {
    if (gameData.loading) {
      return tasks.map((t) => ({ ...t, metrics: null, recommendation: null }));
    }
    return tasks.map((task) => {
      const metrics = computeTaskMetrics(task, gameData.priceById, gameData.loot);
      const recommendation = getTaskRecommendation(
        task,
        tasks,
        gameData.priceById,
        gameData.loot
      );
      return { ...task, metrics, recommendation };
    });
  }, [tasks, gameData]);

  const selectedEnrichedTask = useMemo(
    () => enrichedTasks.find((t) => t.id === selectedId) ?? null,
    [enrichedTasks, selectedId]
  );

  function openAdd() {
    setEditingTask(null);
    setShowForm(true);
  }

  function handleEdit(task) {
    setEditingTask(task);
    setShowForm(true);
  }

  function handleSave(taskData) {
    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      const newTask = addTask(taskData);
      setSelectedId(newTask.id);
    }
    setShowForm(false);
    setEditingTask(null);
  }

  function handleDelete(id) {
    deleteTask(id);
    if (selectedId === id) setSelectedId(null);
    if (editingTask?.id === id) {
      setShowForm(false);
      setEditingTask(null);
    }
  }

  function handleSelect(id) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function closeForm() {
    setShowForm(false);
    setEditingTask(null);
  }

  if (gameData.loading) {
    return (
      <div className="app app--loading">
        <div className="loading-card">
          <div className="loading-pulse" />
          <p>Loading game data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="site-header">
        <div>
          <a href="../" className="home">← OSRS Tools</a>
          <h1>Slayer Task Tracker</h1>
          <p className="sub">
            Log tasks · compare XP &amp; GP rates · decide what to skip, extend, or speed up
          </p>
        </div>
      </header>

      {gameData.error && (
        <div className="error-banner">
          Failed to load game data: {gameData.error}
        </div>
      )}

      <StatsBanner tasks={enrichedTasks} />
      <XpGpScatterChart tasks={enrichedTasks} />

      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "tasks" && (
        <div className="tab-panel tasks-layout">
          <div className="tasks-left">
            <div className="tasks-toolbar">
              <button className="btn-primary" onClick={openAdd}>
                + Log Task
              </button>
              <ImportExport tasks={tasks} onImport={importTasks} />
            </div>
            <TaskList
              tasks={enrichedTasks}
              selectedId={selectedId}
              onSelect={handleSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          {selectedEnrichedTask && (
            <div className="tasks-right">
              <TaskDetail
                task={selectedEnrichedTask}
                gameData={gameData}
                onUpdate={updateTask}
                onEdit={() => handleEdit(selectedEnrichedTask)}
                onDelete={() => handleDelete(selectedEnrichedTask.id)}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
        </div>
      )}

      {tab === "analytics" && (
        <div className="tab-panel">
          <AnalyticsDashboard tasks={enrichedTasks} gameData={gameData} />
        </div>
      )}

      {showForm && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div className="modal-panel">
            <TaskForm
              initialTask={editingTask}
              gameData={gameData}
              onSave={handleSave}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}
