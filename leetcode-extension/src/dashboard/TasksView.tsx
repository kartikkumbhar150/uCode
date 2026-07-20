import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, ListTodo } from "lucide-react";
import { clarioTasksApi } from "../services/clario-api";
import type { ClarioTask } from "../services/clario-api";

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

export default function TasksView() {
  const [tasks, setTasks] = useState<ClarioTask[]>([]);
  const [date, setDate] = useState(todayKey());
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clarioTasksApi.getByDate(date);
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    setAdding(true);
    try {
      const task = await clarioTasksApi.create(newTask.trim(), date);
      setTasks((prev) => [...prev, task]);
      setNewTask("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setAdding(false);
    }
  }

  async function handleComplete(id: string) {
    try {
      const updated = await clarioTasksApi.markCompleted(id);
      setTasks((prev) => prev.map((t) => (t._id === id ? updated : t)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to complete task");
    }
  }

  const completed = tasks.filter((t) => t.isCompleted).length;
  const total = tasks.length;
  const isToday = date === todayKey();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Tasks</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
            {isToday ? "Today's tasks" : `Tasks for ${new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`}
          </p>
        </div>
        <input
          type="date"
          className="date-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Progress</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {completed}/{total} completed
            </span>
          </div>
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
              transition={{ duration: 0.8 }}
              style={{ background: completed === total ? "var(--easy)" : "var(--accent)" }}
            />
          </div>
        </div>
      )}

      {/* Add task form */}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8 }}>
        <input
          className="text-input"
          placeholder="Add a new task…"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={adding || !newTask.trim()}
          style={{ opacity: adding || !newTask.trim() ? 0.6 : 1 }}
        >
          <Plus size={14} /> Add
        </button>
      </form>

      {/* Task list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📋</span>
          <h2 className="empty-state-title">No tasks yet</h2>
          <p className="empty-state-text">Add your first task for this day to start tracking.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <AnimatePresence>
            {tasks.map((task, i) => (
              <motion.div
                key={task._id}
                className={`task-item ${task.isCompleted ? "completed" : ""}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  className={`task-checkbox ${task.isCompleted ? "checked" : ""}`}
                  onClick={() => !task.isCompleted && handleComplete(task._id)}
                  disabled={task.isCompleted}
                >
                  {task.isCompleted && <Check size={12} color="#000" />}
                </button>
                <span className="task-name" style={{ fontSize: 14, flex: 1 }}>
                  {task.taskName}
                </span>
                {task.isCompleted && (
                  <span style={{ fontSize: 11, color: "var(--easy)", fontWeight: 600 }}>Done</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Summary */}
      {total > 0 && completed === total && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card"
          style={{
            textAlign: "center",
            padding: "1.5rem",
            background: "rgba(34,197,94,0.08)",
            borderColor: "rgba(34,197,94,0.2)",
          }}
        >
          <ListTodo size={24} color="var(--easy)" style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 700, color: "var(--easy)" }}>All tasks completed! 🎉</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Great work today.
          </div>
        </motion.div>
      )}
    </div>
  );
}
