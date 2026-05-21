import { useEffect, useState, useCallback, useMemo, useRef } from "react";

const App = () => {
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("tf_tasks_v2");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("tf_sound");
    return saved === "true";
  });
  const [draggedTask, setDraggedTask] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [activeContextMenu, setActiveContextMenu] = useState(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [sortBy, setSortBy] = useState("custom");
  const [removingId, setRemovingId] = useState(null);
  const headerRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    dueDate: "",
    priority: "medium",
    note: "",
    category: "personal",
    recurring: "none",
  });

  // Persist tasks
  useEffect(() => {
    localStorage.setItem("tf_tasks_v2", JSON.stringify(tasks));
  }, [tasks]);

  // Persist sound setting
  useEffect(() => {
    localStorage.setItem("tf_sound", String(soundEnabled));
  }, [soundEnabled]);

  // Animate header on mount
  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.classList.add("animate-in");
    }
  }, []);

  // ── Sound ──────────────────────────────────────────────────────────────────
  const audioCtxRef = useRef(null);

  const playSound = useCallback(
    (type) => {
      if (!soundEnabled) return;

      try {
        // Create only once
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (
            window.AudioContext || window.webkitAudioContext
          )();
        }

        const ctx = audioCtxRef.current;

        // Resume if browser suspended it
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "success") {
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(
            1200,
            ctx.currentTime + 0.1,
          );
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        } else if (type === "delete") {
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(
            200,
            ctx.currentTime + 0.2,
          );
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch (err) {
        console.log("Audio failed:", err);
      }
    },
    [soundEnabled],
  );
  // ── Notifications ──────────────────────────────────────────────────────────
  const showNotification = useCallback(
    (title, text, type = "success") => {
      playSound("notification");
      const id = Date.now() + Math.random();
      setNotifications((prev) => [...prev, { id, title, text, type }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    },
    [playSound],
  );

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Deadline checker ───────────────────────────────────────────────────────
  const checkDeadlines = useCallback(() => {
    const now = new Date();
    tasks.forEach((t) => {
      if (t.done || t._notified) return;
      const due = new Date(t.dueDate);
      const minLeft = (due - now) / 60000;
      if (minLeft <= 30 && minLeft > 0) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === t.id ? { ...task, _notified: true } : task,
          ),
        );
        const mins = Math.round(minLeft);
        showNotification(
          "Deadline Alert!",
          `"${t.name}" due in ${mins} min${mins !== 1 ? "s" : ""}.`,
          "warning",
        );
      } else if (minLeft < 0 && minLeft > -5) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === t.id ? { ...task, _notified: true } : task,
          ),
        );
        showNotification(
          "Task Overdue!",
          `"${t.name}" passed its deadline.`,
          "danger",
        );
      }
    });
  }, [tasks, showNotification]);

  useEffect(() => {
    const timer = setTimeout(checkDeadlines, 3000);
    const interval = setInterval(checkDeadlines, 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [checkDeadlines]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getStatus = useCallback((dueDate) => {
    if (!dueDate) return "upcoming";
    const now = new Date();
    const due = new Date(dueDate);
    const h = (due - now) / 3.6e6;
    if (h < 0) return "overdue";
    if (h < 24) return "today";
    if (h < 48) return "tomorrow";
    return "upcoming";
  }, []);

  const getStatusBadge = useCallback((status, done) => {
    if (done) return <span className="badge badge-done">Done</span>;
    const badges = {
      overdue: (
        <span className="badge badge-overdue">
          <span className="pulse-dot danger" />
          Overdue
        </span>
      ),
      today: (
        <span className="badge badge-today">
          <span className="pulse-dot warning" />
          Today
        </span>
      ),
      tomorrow: <span className="badge badge-tomorrow">Tomorrow</span>,
      upcoming: <span className="badge badge-upcoming">Upcoming</span>,
    };
    return badges[status] || null;
  }, []);

  const getPriorityBadge = useCallback((priority) => {
    const map = {
      high: <span className="badge badge-priority-high">Critical</span>,
      medium: <span className="badge badge-priority-medium">Medium</span>,
      low: <span className="badge badge-priority-low">Low</span>,
    };
    return map[priority] || null;
  }, []);

  const getCategoryBadge = useCallback((category) => {
    const colors = {
      work: "var(--accent3)",
      personal: "var(--accent)",
      health: "#22c55e",
      finance: "var(--accent2)",
    };
    return (
      <span
        className="category-badge"
        style={{ "--cat-color": colors[category] || colors.personal }}
      >
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    );
  }, []);

  const formatDate = useCallback((str) => {
    if (!str) return "";
    const date = new Date(str);
    const now = new Date();
    const days = Math.floor((date - now) / 86400000);
    const timeStr = date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    if (days === 0) return `Today, ${timeStr}`;
    if (days === 1) return `Tomorrow, ${timeStr}`;
    if (days === -1) return `Yesterday, ${timeStr}`;
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  const formatRelativeTime = useCallback((str) => {
    if (!str) return "";
    const diff = new Date(str) - new Date();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (diff < 0) {
      if (days < -1) return `${Math.abs(days)}d overdue`;
      if (hours < -1) return `${Math.abs(hours)}h overdue`;
      return "Overdue";
    }
    if (days > 0) return `in ${days}d`;
    if (hours > 0) return `in ${hours}h`;
    return "Due soon";
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      total: tasks.length,
      completed: tasks.filter((t) => t.done).length,
      overdue: tasks.filter(
        (t) => !t.done && getStatus(t.dueDate) === "overdue",
      ).length,
      today: tasks.filter((t) => !t.done && getStatus(t.dueDate) === "today")
        .length,
      upcoming: tasks.filter(
        (t) =>
          !t.done && ["tomorrow", "upcoming"].includes(getStatus(t.dueDate)),
      ).length,
    }),
    [tasks, getStatus],
  );

  const progressPct = stats.total
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  const getMotivationalMessage = useCallback(() => {
    if (progressPct === 100) return "Perfect day! 🎉";
    if (progressPct >= 75) return "Almost there!";
    if (progressPct >= 50) return "Halfway done!";
    if (progressPct >= 25) return "Good start!";
    if (stats.total > 0) return "Let's go!";
    return "Ready?";
  }, [progressPct, stats.total]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let list = tasks.filter((t) => {
      const status = getStatus(t.dueDate);
      const matchSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.note || "").toLowerCase().includes(search.toLowerCase());
      let matchFilter = true;
      if (filter === "done") matchFilter = t.done;
      else if (filter === "active") matchFilter = !t.done;
      else if (filter === "overdue")
        matchFilter = !t.done && status === "overdue";
      else if (filter === "today") matchFilter = !t.done && status === "today";
      else if (filter === "upcoming")
        matchFilter = !t.done && ["tomorrow", "upcoming"].includes(status);
      return matchSearch && matchFilter;
    });

    if (sortBy === "priority") {
      const order = { high: 0, medium: 1, low: 2 };
      list.sort((a, b) => order[a.priority] - order[b.priority]);
    } else if (sortBy === "date") {
      list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } else if (sortBy === "alpha") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (!showCompleted) list = list.filter((t) => !t.done);
    return list;
  }, [tasks, filter, search, sortBy, showCompleted, getStatus]);

  // ── Modal ──────────────────────────────────────────────────────────────────
  const openModal = useCallback((task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        name: task.name,
        dueDate: task.dueDate ? task.dueDate.slice(0, 16) : "",
        priority: task.priority || "medium",
        note: task.note || "",
        category: task.category || "personal",
        recurring: task.recurring || "none",
      });
    } else {
      setEditingTask(null);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setFormData({
        name: "",
        dueDate: tomorrow.toISOString().slice(0, 16),
        priority: "medium",
        note: "",
        category: "personal",
        recurring: "none",
      });
    }
    setIsModalOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTask(null);
    document.body.style.overflow = "";
  }, []);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!formData.name.trim()) {
        showNotification("Error", "Please enter a task name.", "danger");
        return;
      }
      if (!formData.dueDate) {
        showNotification("Error", "Please pick a due date and time.", "danger");
        return;
      }
      if (editingTask) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === editingTask.id
              ? { ...t, ...formData, _notified: false }
              : t,
          ),
        );
        showNotification(
          "Updated!",
          `"${formData.name}" has been updated.`,
          "success",
        );
      } else {
        const newTask = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          ...formData,
          done: false,
          createdAt: Date.now(),
          order: tasks.length,
        };
        setTasks((prev) => [...prev, newTask]);
        showNotification("Created!", `"${formData.name}" added.`, "success");
      }
      playSound("success");
      closeModal();
    },
    [
      formData,
      editingTask,
      tasks.length,
      showNotification,
      playSound,
      closeModal,
    ],
  );

  const toggleDone = useCallback(
    (id) => {
      const task = tasks.find((t) => t.id === id);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : null }
            : t,
        ),
      );
      if (task && !task.done) {
        showNotification(
          "Done!",
          `"${task.name}" marked as complete.`,
          "success",
        );
        playSound("success");
      }
    },
    [tasks, showNotification, playSound],
  );

  const askDelete = useCallback((id) => {
    setDeleteTaskId(id);
    setIsConfirmOpen(true);
    setActiveContextMenu(null);
  }, []);

  const confirmDelete = useCallback(() => {
    const task = tasks.find((t) => t.id === deleteTaskId);
    setRemovingId(deleteTaskId);
    setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));
      setIsConfirmOpen(false);
      setDeleteTaskId(null);
      setRemovingId(null);
      if (task) {
        showNotification("Deleted", `"${task.name}" removed.`, "danger");
        playSound("delete");
      }
    }, 300);
  }, [deleteTaskId, tasks, showNotification, playSound]);

  const duplicateTask = useCallback(
    (task) => {
      if (!task) return;
      const newTask = {
        ...task,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: `${task.name} (Copy)`,
        done: false,
        createdAt: Date.now(),
        _notified: false,
      };
      setTasks((prev) => [...prev, newTask]);
      showNotification("Duplicated!", `"${task.name}" duplicated.`, "success");
      playSound("success");
      setActiveContextMenu(null);
    },
    [showNotification, playSound],
  );

  const exportTasks = useCallback(() => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taskflow-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Exported!", "Tasks exported successfully.", "success");
    setIsSettingsOpen(false);
  }, [tasks, showNotification]);

  const importTasks = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (Array.isArray(imported)) {
            setTasks(imported);
            showNotification(
              "Imported!",
              `${imported.length} tasks imported.`,
              "success",
            );
            playSound("success");
          } else {
            showNotification("Error", "Invalid file format.", "danger");
          }
        } catch {
          showNotification("Error", "Failed to parse the file.", "danger");
        }
      };
      reader.readAsText(file);
      setIsSettingsOpen(false);
    },
    [showNotification, playSound],
  );

  const clearCompleted = useCallback(() => {
    const count = tasks.filter((t) => t.done).length;
    if (count === 0) {
      showNotification("Info", "No completed tasks to clear.", "warning");
      return;
    }
    setTasks((prev) => prev.filter((t) => !t.done));
    showNotification(
      "Cleared!",
      `${count} task${count !== 1 ? "s" : ""} removed.`,
      "success",
    );
    playSound("delete");
  }, [tasks, showNotification, playSound]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeModal();
        setIsConfirmOpen(false);
        setIsSettingsOpen(false);
        setActiveContextMenu(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        document.getElementById("searchInput")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeModal, openModal]);

  // Close context menu on outside click
  useEffect(() => {
    const handle = () => setActiveContextMenu(null);
    window.addEventListener("click", handle);
    return () => window.removeEventListener("click", handle);
  }, []);

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const handleDrop = useCallback(
    (targetId) => {
      if (!draggedTask || draggedTask.id === targetId) return;
      setTasks((prev) => {
        const arr = [...prev];
        const fromIdx = arr.findIndex((t) => t.id === draggedTask.id);
        const toIdx = arr.findIndex((t) => t.id === targetId);
        const [moved] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, moved);
        return arr;
      });
      setDraggedTask(null);
      setDropTarget(null);
    },
    [draggedTask],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="bg-mesh" />
      <div className="bg-noise" />

      {/* Notifications */}
      <div className="notif-container" role="region" aria-label="Notifications">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`notif notif-enter ${notif.type}`}
            role="alert"
          >
            <div className="notif-icon">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                {notif.type === "success" && (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                )}
                {notif.type === "danger" && (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                )}
                {notif.type === "warning" && (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                )}
              </svg>
            </div>
            <div className="notif-body">
              <div className="notif-title">{notif.title}</div>
              <div className="notif-text">{notif.text}</div>
            </div>
            <button
              className="notif-close"
              onClick={() => dismissNotification(notif.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay open"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title" id="modal-title">
                {editingTask ? "Edit Task" : "New Task"}
              </h2>
              <button
                className="modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="taskName">Task Name</label>
                <input
                  id="taskName"
                  type="text"
                  placeholder="What needs to be done?"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dueDate">Due Date &amp; Time</label>
                  <input
                    id="dueDate"
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, dueDate: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, category: e.target.value }))
                    }
                  >
                    <option value="personal">Personal</option>
                    <option value="work">Work</option>
                    <option value="health">Health</option>
                    <option value="finance">Finance</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <div className="priority-grid">
                  {["low", "medium", "high"].map((p) => (
                    <div
                      key={p}
                      className={`priority-chip ${p} ${
                        formData.priority === p ? "active" : ""
                      }`}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, priority: p }))
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        setFormData((prev) => ({ ...prev, priority: p }))
                      }
                    >
                      <span className="priority-dot" />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="recurring">Recurring</label>
                <select
                  id="recurring"
                  value={formData.recurring}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, recurring: e.target.value }))
                  }
                >
                  <option value="none">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  rows="2"
                  placeholder="Add details..."
                  value={formData.note}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, note: e.target.value }))
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingTask ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {isConfirmOpen && (
        <div
          className="confirm-overlay open"
          onClick={(e) =>
            e.target === e.currentTarget && setIsConfirmOpen(false)
          }
          role="dialog"
          aria-modal="true"
        >
          <div className="confirm-box">
            <div className="confirm-icon">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h3>Delete Task?</h3>
            <p>This action cannot be undone.</p>
            <div className="confirm-actions">
              <button
                className="btn-confirm-cancel"
                onClick={() => setIsConfirmOpen(false)}
              >
                Keep It
              </button>
              <button className="btn-confirm-delete" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      {isSettingsOpen && (
        <div
          className="modal-overlay open"
          onClick={(e) =>
            e.target === e.currentTarget && setIsSettingsOpen(false)
          }
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-box settings-modal">
            <div className="modal-header">
              <h2 className="modal-title">Settings</h2>
              <button
                className="modal-close"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close"
              >
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="settings-section">
              <h3>Sound</h3>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={() => setSoundEnabled((v) => !v)}
                />
                <span className="toggle-slider" />
                <span className="toggle-label">Sound effects</span>
              </label>
            </div>

            <div className="settings-section">
              <h3>Display</h3>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={() => setShowCompleted((v) => !v)}
                />
                <span className="toggle-slider" />
                <span className="toggle-label">Show completed tasks</span>
              </label>
            </div>

            <div className="settings-section">
              <h3>Sort</h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="settings-select"
              >
                <option value="custom">Custom (drag order)</option>
                <option value="priority">Priority</option>
                <option value="date">Due Date</option>
                <option value="alpha">A–Z</option>
              </select>
            </div>

            <div className="settings-section">
              <h3>Data</h3>
              <div className="settings-actions">
                <button className="settings-btn" onClick={exportTasks}>
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="14"
                    height="14"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  Export JSON
                </button>
                <label className="settings-btn" style={{ cursor: "pointer" }}>
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="14"
                    height="14"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Import JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={importTasks}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>

            {stats.completed > 0 && (
              <div className="settings-section">
                <h3>Danger Zone</h3>
                <button
                  className="settings-btn danger"
                  onClick={clearCompleted}
                >
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="14"
                    height="14"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Clear {stats.completed} Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="app-wrapper">
        <header ref={headerRef}>
          <div className="logo-badge">
            <div className="logo-icon">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span>TaskFlow</span>
          </div>
          <h1>Master Your Day</h1>
          <p>A smart workspace for tasks that matter</p>
        </header>

        {/* Stats */}
        <div className="stats-bar">
          {[
            { key: "total", label: "Total", value: stats.total },
            { key: "completed", label: "Done", value: stats.completed },
            { key: "overdue", label: "Overdue", value: stats.overdue },
            { key: "today", label: "Today", value: stats.today },
          ].map((s) => (
            <div key={s.key} className={`stat-chip ${s.key}`}>
              <div className="stat-num">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        {stats.total > 0 && (
          <div className="progress-section">
            <div className="progress-header">
              <div className="progress-info">
                <span className="progress-label-text">Progress</span>
                <span className="progress-sublabel">
                  {getMotivationalMessage()}
                </span>
              </div>
              <strong className="progress-percent">{progressPct}%</strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-bar"
                style={{ width: `${progressPct}%` }}
              >
                <div className="progress-glow" />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="action-row">
          <button
            className="add-trigger-btn"
            id="addBtn"
            onClick={() => openModal()}
          >
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Task
          </button>
          <button
            className="settings-trigger"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
          >
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="search-filter-row">
          <div className="search-wrap">
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35"
              />
            </svg>
            <input
              className="search-input"
              id="searchInput"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
              aria-label="Search tasks"
            />
            {search && (
              <button
                className="search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar" role="tablist" aria-label="Task filters">
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "overdue", label: "Overdue" },
            { key: "today", label: "Today" },
            { key: "upcoming", label: "Upcoming" },
            { key: "done", label: "Done" },
          ].map((f) => (
            <button
              key={f.key}
              className={`filter-btn ${filter === f.key ? "active" : ""}`}
              onClick={() => setFilter(f.key)}
              role="tab"
              aria-selected={filter === f.key}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="section-header">
          <div className="section-label">
            {filteredTasks.length} Task
            {filteredTasks.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Task List */}
        <div className="tasks-list" role="list">
          {filteredTasks.map((task) => {
            const status = getStatus(task.dueDate);
            const isRemoving = removingId === task.id;
            const cardClass = [
              "task-card",
              task.done ? "done" : status,
              draggedTask?.id === task.id ? "dragging" : "",
              dropTarget === task.id ? "drop-target" : "",
              isRemoving ? "removing" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={task.id}
                className={cardClass}
                data-task-id={task.id}
                role="listitem"
                draggable
                onDragStart={(e) => {
                  setDraggedTask(task);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedTask && draggedTask.id !== task.id)
                    setDropTarget(task.id);
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(task.id);
                }}
                onDragEnd={() => {
                  setDraggedTask(null);
                  setDropTarget(null);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActiveContextMenu({
                    id: task.id,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
              >
                <div className="task-inner">
                  <div className="task-check-wrap">
                    <button
                      className={`task-check ${task.done ? "checked" : ""}`}
                      onClick={() => toggleDone(task.id)}
                      aria-label={
                        task.done ? "Mark incomplete" : "Mark complete"
                      }
                    >
                      <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="task-body">
                    <div className="task-header-row">
                      <div className="task-name">{task.name}</div>
                      <div className="task-badges">
                        {getCategoryBadge(task.category)}
                        {getPriorityBadge(task.priority)}
                      </div>
                    </div>
                    <div className="task-meta">
                      {getStatusBadge(status, task.done)}
                      <span className="task-date">
                        <svg
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {formatDate(task.dueDate)}
                      </span>
                      <span
                        className="task-relative"
                        style={{
                          color: task.done
                            ? "var(--accent)"
                            : status === "overdue"
                              ? "var(--danger)"
                              : status === "today"
                                ? "var(--accent2)"
                                : "var(--text3)",
                        }}
                      >
                        {formatRelativeTime(task.dueDate)}
                      </span>
                    </div>
                    {task.note && (
                      <div className="task-note">
                        <svg
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                          />
                        </svg>
                        {task.note}
                      </div>
                    )}
                    {task.recurring && task.recurring !== "none" && (
                      <div className="task-recurring">↻ {task.recurring}</div>
                    )}
                  </div>

                  <div className="task-actions">
                    <button
                      className="task-btn edit"
                      onClick={() => openModal(task)}
                      aria-label="Edit task"
                    >
                      <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      className="task-btn delete"
                      onClick={() => askDelete(task.id)}
                      aria-label="Delete task"
                    >
                      <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredTasks.length === 0 && (
          <div className="empty-state visible">
            <div className="empty-illustration">
              <svg viewBox="0 0 200 200" fill="none">
                <circle cx="100" cy="100" r="80" fill="var(--surface2)" />
                <path
                  d="M70 100l20 20 40-40"
                  stroke="var(--accent)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="140" cy="60" r="12" fill="var(--accent2)" />
              </svg>
            </div>
            <h3>
              {search
                ? "No Results"
                : filter !== "all"
                  ? "Nothing Here"
                  : "No Tasks Yet"}
            </h3>
            <p>
              {search
                ? `No tasks match "${search}".`
                : filter === "done"
                  ? "No completed tasks yet."
                  : filter === "overdue"
                    ? "Great! No overdue tasks."
                    : filter === "today"
                      ? "No tasks due today!"
                      : filter === "upcoming"
                        ? "No upcoming tasks."
                        : "Ready to be productive?"}
            </p>
            {!search && filter === "all" && (
              <button className="empty-cta" onClick={() => openModal()}>
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Your First Task
              </button>
            )}
          </div>
        )}

        <footer className="app-footer">
          <p>TaskFlow · Stay productive</p>
          <div className="footer-stats">
            <span>{stats.total} tasks</span>
            <span>·</span>
            <span>{progressPct}% done</span>
            <span>·</span>
            <span>{stats.overdue} overdue</span>
          </div>
        </footer>
      </div>

      {/* Context Menu */}
      {activeContextMenu && (
        <div
          className="context-menu"
          style={{
            top: Math.min(activeContextMenu.y, window.innerHeight - 220),
            left: Math.min(activeContextMenu.x, window.innerWidth - 190),
          }}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          <button
            onClick={() => {
              openModal(tasks.find((t) => t.id === activeContextMenu.id));
              setActiveContextMenu(null);
            }}
            role="menuitem"
          >
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </button>
          <button
            onClick={() =>
              duplicateTask(tasks.find((t) => t.id === activeContextMenu.id))
            }
            role="menuitem"
          >
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Duplicate
          </button>
          <button
            onClick={() => {
              toggleDone(activeContextMenu.id);
              setActiveContextMenu(null);
            }}
            role="menuitem"
          >
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {tasks.find((t) => t.id === activeContextMenu.id)?.done
              ? "Undo Complete"
              : "Mark Complete"}
          </button>
          <div className="context-menu-divider" />
          <button
            className="danger"
            onClick={() => askDelete(activeContextMenu.id)}
            role="menuitem"
          >
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        </div>
      )}
    </>
  );
};

export default App;
