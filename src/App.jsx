import { useEffect, useState, useCallback, useMemo } from "react";
import gsap from "gsap";

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
  
  const [formData, setFormData] = useState({
    name: "",
    dueDate: "",
    priority: "medium",
    note: "",
    category: "personal",
    recurring: "none"
  });

  useEffect(() => {
    localStorage.setItem("tf_tasks_v2", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("tf_sound", String(soundEnabled));
  }, [soundEnabled]);

  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "success") {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === "delete") {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "notification") {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.log("Audio not supported");
    }
  }, [soundEnabled]);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".logo-badge", { y: -20, opacity: 0, duration: 0.5, scale: 0.9 })
      .from("header h1", { y: 30, opacity: 0, duration: 0.6, ease: "back.out(1.4)" }, "-=0.2")
      .from("header p", { y: 15, opacity: 0, duration: 0.4 }, "-=0.3")
      .from(".stat-chip", { y: 20, opacity: 0, stagger: 0.06, duration: 0.4 }, "-=0.2")
      .from("#addBtn", { scale: 0.9, opacity: 0, duration: 0.4, ease: "back.out(1.6)" }, "-=0.1")
      .from(".search-wrap, .filter-bar", { y: 10, opacity: 0, stagger: 0.08, duration: 0.3 }, "-=0.1");
  }, []);

  useEffect(() => {
    const interval = setInterval(checkDeadlines, 30000);
    setTimeout(checkDeadlines, 3000);
    return () => clearInterval(interval);
  }, [tasks]);

  const showNotification = useCallback((title, text, type = "success") => {
    playSound("notification");
    const id = Date.now();
    const notif = { id, title, text, type };
    setNotifications(prev => [...prev, notif]);
    
    gsap.fromTo(`[data-notif-id="${id}"]`, 
      { x: 50, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: "back.out(1.4)" }
    );
    
    setTimeout(() => {
      gsap.to(`[data-notif-id="${id}"]`, { 
        x: 100, 
        opacity: 0, 
        duration: 0.3, 
        ease: "power2.in",
        onComplete: () => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }
      });
    }, 5000);
  }, [playSound]);

  const dismissNotification = useCallback((id) => {
    gsap.to(`[data-notif-id="${id}"]`, { 
      x: 100, 
      opacity: 0, 
      duration: 0.3, 
      ease: "power2.in",
      onComplete: () => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    });
  }, []);

  const checkDeadlines = useCallback(() => {
    const now = new Date();
    tasks.forEach(t => {
      if (t.done || t._notified) return;
      const due = new Date(t.dueDate);
      const minLeft = (due - now) / 60000;
      
      if (minLeft <= 30 && minLeft > 0) {
        setTasks(prev => prev.map(task => 
          task.id === t.id ? { ...task, _notified: true } : task
        ));
        const mins = Math.round(minLeft);
        showNotification(
          "Deadline Alert!",
          `"${t.name}" is due in ${mins} min${mins !== 1 ? "s" : ""}.`,
          "warning"
        );
      } else if (minLeft < 0 && minLeft > -5) {
        setTasks(prev => prev.map(task => 
          task.id === t.id ? { ...task, _notified: true } : task
        ));
        showNotification(
          "Task Overdue!",
          `"${t.name}" has passed its deadline.`,
          "danger"
        );
      }
    });
  }, [tasks, showNotification]);

  const getStatus = useCallback((dueDate) => {
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
      overdue: <span className="badge badge-overdue"><span className="pulse-dot danger"></span> Overdue</span>,
      today: <span className="badge badge-today"><span className="pulse-dot warning"></span> Today</span>,
      tomorrow: <span className="badge badge-tomorrow">Tomorrow</span>,
      upcoming: <span className="badge badge-upcoming">Upcoming</span>
    };
    return badges[status] || null;
  }, []);

  const getPriorityBadge = useCallback((priority) => {
    const badges = {
      high: <span className="badge badge-priority-high">Critical</span>,
      medium: <span className="badge badge-priority-medium">Medium</span>,
      low: <span className="badge badge-priority-low">Low</span>
    };
    return badges[priority] || null;
  }, []);

  const getCategoryBadge = useCallback((category) => {
    const colors = {
      work: "var(--accent3)",
      personal: "var(--accent)",
      health: "#22c55e",
      finance: "var(--accent2)"
    };
    return (
      <span className="category-badge" style={{ "--cat-color": colors[category] || colors.personal }}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    );
  }, []);

  const formatDate = useCallback((str) => {
    const date = new Date(str);
    const now = new Date();
    const diff = date - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return `Today, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
    } else if (days === 1) {
      return `Tomorrow, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
    } else if (days === -1) {
      return `Yesterday, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
    }
    
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }, []);

  const formatRelativeTime = useCallback((str) => {
    const date = new Date(str);
    const now = new Date();
    const diff = date - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diff < 0) {
      if (days < -1) return `${Math.abs(days)}d overdue`;
      if (hours < -1) return `${Math.abs(hours)}h overdue`;
      return "Overdue";
    }
    
    if (days > 0) return `in ${days}d`;
    if (hours > 0) return `in ${hours}h`;
    return "Due soon";
  }, []);

  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.done).length,
    overdue: tasks.filter(t => !t.done && getStatus(t.dueDate) === "overdue").length,
    today: tasks.filter(t => !t.done && getStatus(t.dueDate) === "today").length,
    upcoming: tasks.filter(t => !t.done && (getStatus(t.dueDate) === "tomorrow" || getStatus(t.dueDate) === "upcoming")).length
  }), [tasks, getStatus]);

  const progressPct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(t => {
      const status = getStatus(t.dueDate);
      const matchSearch = !search || 
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.note || "").toLowerCase().includes(search.toLowerCase());
      
      let matchFilter = true;
      if (filter === "done") matchFilter = t.done;
      else if (filter === "active") matchFilter = !t.done;
      else if (filter === "overdue") matchFilter = !t.done && status === "overdue";
      else if (filter === "today") matchFilter = !t.done && status === "today";
      else if (filter === "upcoming") matchFilter = !t.done && (status === "tomorrow" || status === "upcoming");
      
      return matchSearch && matchFilter;
    });

    if (sortBy === "priority") {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    } else if (sortBy === "date") {
      filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } else if (sortBy === "alpha") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (!showCompleted) {
      filtered = filtered.filter(t => !t.done);
    }
    
    return filtered;
  }, [tasks, filter, search, sortBy, showCompleted, getStatus]);

  const openModal = useCallback((task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        name: task.name,
        dueDate: task.dueDate.slice(0, 16),
        priority: task.priority || "medium",
        note: task.note || "",
        category: task.category || "personal",
        recurring: task.recurring || "none"
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
        recurring: "none"
      });
    }
    setIsModalOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeModal = useCallback(() => {
    gsap.to(".modal-box", { 
      y: 50, 
      opacity: 0, 
      duration: 0.2, 
      onComplete: () => {
        setIsModalOpen(false);
        setEditingTask(null);
        document.body.style.overflow = "";
      }
    });
  }, []);

  const handleSubmit = useCallback((e) => {
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
      setTasks(prev => prev.map(t => 
        t.id === editingTask.id 
          ? { ...t, ...formData, _notified: false }
          : t
      ));
      showNotification("Updated!", `"${formData.name}" has been updated.`, "success");
      playSound("success");
    } else {
      const newTask = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        ...formData,
        done: false,
        createdAt: Date.now(),
        order: tasks.length
      };
      setTasks(prev => [...prev, newTask]);
      showNotification("Created!", `"${formData.name}" added.`, "success");
      playSound("success");
    }
    closeModal();
  }, [formData, editingTask, tasks.length, showNotification, playSound, closeModal]);

  const toggleDone = useCallback((id) => {
    const task = tasks.find(t => t.id === id);
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : null } : t
    ));
    
    if (task && !task.done) {
      showNotification("Done!", `"${task.name}" marked as complete.`, "success");
      playSound("success");
    }
  }, [tasks, showNotification, playSound]);

  const askDelete = useCallback((id) => {
    setDeleteTaskId(id);
    setIsConfirmOpen(true);
    setActiveContextMenu(null);
  }, []);

  const confirmDelete = useCallback(() => {
    const task = tasks.find(t => t.id === deleteTaskId);
    const el = document.querySelector(`[data-task-id="${deleteTaskId}"]`);
    
    if (el) {
      gsap.to(el, { 
        x: 80, 
        opacity: 0, 
        height: 0, 
        marginBottom: 0, 
        padding: 0, 
        duration: 0.35, 
        ease: "power2.in", 
        onComplete: () => {
          setTasks(prev => prev.filter(t => t.id !== deleteTaskId));
          setIsConfirmOpen(false);
          setDeleteTaskId(null);
          if (task) {
            showNotification("Deleted", `"${task.name}" removed.`, "danger");
            playSound("delete");
          }
        }
      });
    } else {
      setTasks(prev => prev.filter(t => t.id !== deleteTaskId));
      setIsConfirmOpen(false);
      setDeleteTaskId(null);
      if (task) {
        showNotification("Deleted", `"${task.name}" removed.`, "danger");
        playSound("delete");
      }
    }
  }, [deleteTaskId, tasks, showNotification, playSound]);

  const duplicateTask = useCallback((task) => {
    const newTask = {
      ...task,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: `${task.name} (Copy)`,
      done: false,
      createdAt: Date.now(),
      _notified: false
    };
    setTasks(prev => [...prev, newTask]);
    showNotification("Duplicated!", `"${task.name}" duplicated.`, "success");
    playSound("success");
    setActiveContextMenu(null);
  }, [showNotification, playSound]);

  const exportTasks = useCallback(() => {
    const data = JSON.stringify(tasks, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taskflow-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Exported!", "Tasks exported successfully.", "success");
    setIsSettingsOpen(false);
  }, [tasks, showNotification]);

  const importTasks = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          setTasks(imported);
          showNotification("Imported!", `${imported.length} tasks imported.`, "success");
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
  }, [showNotification, playSound]);

  const clearCompleted = useCallback(() => {
    const completed = tasks.filter(t => t.done);
    if (completed.length === 0) {
      showNotification("Info", "No completed tasks to clear.", "warning");
      return;
    }
    setTasks(prev => prev.filter(t => !t.done));
    showNotification("Cleared!", `${completed.length} task${completed.length !== 1 ? "s" : ""} removed.`, "success");
    playSound("delete");
  }, [tasks, showNotification, playSound]);

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

  useEffect(() => {
    const handleClick = () => setActiveContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const getMotivationalMessage = useCallback(() => {
    const pct = progressPct;
    if (pct === 100) return "Perfect day!";
    if (pct >= 75) return "Almost there!";
    if (pct >= 50) return "Halfway done!";
    if (pct >= 25) return "Good start!";
    if (stats.total > 0) return "Let's go!";
    return "Ready?";
  }, [progressPct, stats.total]);

  return (
    <>
      <div className="bg-mesh" />
      <div className="bg-noise" />
      
      <div className="notif-container">
        {notifications.map(notif => (
          <div 
            key={notif.id} 
            className={`notif ${notif.type}`}
            data-notif-id={notif.id}
            role="alert"
          >
            <div className="notif-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                {notif.type === "success" && (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                )}
                {notif.type === "danger" && (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                )}
                {notif.type === "warning" && (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                )}
              </svg>
            </div>
            <div className="notif-body">
              <div className="notif-title">{notif.title}</div>
              <div className="notif-text">{notif.text}</div>
            </div>
            <button className="notif-close" onClick={() => dismissNotification(notif.id)} aria-label="Dismiss">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div 
        className={`modal-overlay ${isModalOpen ? "open" : ""}`} 
        onClick={(e) => e.target === e.currentTarget && closeModal()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-box">
          <div className="modal-header">
            <h2 className="modal-title">{editingTask ? "Edit Task" : "New Task"}</h2>
            <button className="modal-close" onClick={closeModal} aria-label="Close">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="taskName">Task Name</label>
              <input
                id="taskName"
                type="text"
                placeholder="What needs to be done?"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                autoComplete="off"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dueDate">Due Date & Time</label>
                <input
                  id="dueDate"
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
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
                {["low", "medium", "high"].map(p => (
                  <div
                    key={p}
                    className={`priority-chip ${p} ${formData.priority === p ? "active" : ""}`}
                    onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="priority-dot"></span>
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
                onChange={(e) => setFormData(prev => ({ ...prev, recurring: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              />
            </div>
            
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn-save">
                {editingTask ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div 
        className={`confirm-overlay ${isConfirmOpen ? "open" : ""}`}
        onClick={(e) => e.target === e.currentTarget && setIsConfirmOpen(false)}
        role="dialog"
        aria-modal="true"
      >
        <div className="confirm-box">
          <div className="confirm-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3>Delete Task?</h3>
          <p>This action cannot be undone.</p>
          <div className="confirm-actions">
            <button className="btn-confirm-cancel" onClick={() => setIsConfirmOpen(false)}>Keep It</button>
            <button className="btn-confirm-delete" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </div>

      <div 
        className={`modal-overlay ${isSettingsOpen ? "open" : ""}`}
        onClick={(e) => e.target === e.currentTarget && setIsSettingsOpen(false)}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-box settings-modal">
          <div className="modal-header">
            <h2 className="modal-title">Settings</h2>
            <button className="modal-close" onClick={() => setIsSettingsOpen(false)} aria-label="Close">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="settings-section">
            <h3>Sound</h3>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={soundEnabled} 
                onChange={() => setSoundEnabled(!soundEnabled)} 
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Sound effects</span>
            </label>
          </div>

          <div className="settings-section">
            <h3>Display</h3>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={showCompleted} 
                onChange={() => setShowCompleted(!showCompleted)} 
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Show completed</span>
            </label>
          </div>

          <div className="settings-section">
            <h3>Sort</h3>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)} 
              className="settings-select"
            >
              <option value="custom">Custom</option>
              <option value="priority">Priority</option>
              <option value="date">Due Date</option>
              <option value="alpha">A-Z</option>
            </select>
          </div>

          <div className="settings-section">
            <h3>Data</h3>
            <div className="settings-actions">
              <button className="settings-btn" onClick={exportTasks}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export
              </button>
              <label className="settings-btn">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Import
                <input type="file" accept=".json" onChange={importTasks} style={{ display: "none" }} />
              </label>
            </div>
          </div>

          {stats.completed > 0 && (
            <div className="settings-section">
              <h3>Danger Zone</h3>
              <button className="settings-btn danger" onClick={clearCompleted}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear {stats.completed} Done
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="app-wrapper">
        <header>
          <div className="logo-badge">
            <div className="logo-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>TaskFlow</span>
          </div>
          <h1>Master Your Day</h1>
          <p>A smart workspace for tasks that matter</p>
        </header>

        <div className="stats-bar">
          <div className="stat-chip total">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-chip completed">
            <div className="stat-num">{stats.completed}</div>
            <div className="stat-label">Done</div>
          </div>
          <div className="stat-chip overdue">
            <div className="stat-num">{stats.overdue}</div>
            <div className="stat-label">Overdue</div>
          </div>
          <div className="stat-chip today">
            <div className="stat-num">{stats.today}</div>
            <div className="stat-label">Today</div>
          </div>
        </div>

        {stats.total > 0 && (
          <div className="progress-section">
            <div className="progress-header">
              <div className="progress-info">
                <span className="progress-label-text">Progress</span>
                <span className="progress-sublabel">{getMotivationalMessage()}</span>
              </div>
              <strong className="progress-percent">{progressPct}%</strong>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${progressPct}%` }}>
                <div className="progress-glow"></div>
              </div>
            </div>
          </div>
        )}

        <div className="action-row">
          <button className="add-trigger-btn" id="addBtn" onClick={() => openModal()}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
          <button className="settings-trigger" onClick={() => setIsSettingsOpen(true)} aria-label="Settings">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        <div className="search-filter-row">
          <div className="search-wrap">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              className="search-input"
              id="searchInput"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="filter-bar" role="tablist">
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "overdue", label: "Overdue" },
            { key: "today", label: "Today" },
            { key: "upcoming", label: "Upcoming" },
            { key: "done", label: "Done" }
          ].map(f => (
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
            {filteredTasks.length} Task{filteredTasks.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="tasks-list" role="list">
          {filteredTasks.map(task => {
            const status = getStatus(task.dueDate);
            const cardClass = [
              "task-card",
              task.done ? "done" : status,
              draggedTask?.id === task.id ? "dragging" : "",
              dropTarget === task.id ? "drop-target" : ""
            ].filter(Boolean).join(" ");
            
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
                  if (draggedTask && draggedTask.id !== task.id) {
                    setDropTarget(task.id);
                  }
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggedTask(null);
                  setDropTarget(null);
                }}
                onDragEnd={() => {
                  setDraggedTask(null);
                  setDropTarget(null);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActiveContextMenu({ id: task.id, x: e.clientX, y: e.clientY });
                }}
              >
                <div className="task-inner">
                  <div className="task-check-wrap">
                    <button
                      className={`task-check ${task.done ? "checked" : ""}`}
                      onClick={() => toggleDone(task.id)}
                      aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                    >
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(task.dueDate)}
                      </span>
                      <span className="task-relative" style={{ 
                        color: task.done ? "var(--accent)" : 
                               status === "overdue" ? "var(--danger)" : 
                               status === "today" ? "var(--accent2)" : "var(--text3)"
                      }}>
                        {formatRelativeTime(task.dueDate)}
                      </span>
                    </div>
                    {task.note && (
                      <div className="task-note">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        {task.note}
                      </div>
                    )}
                  </div>
                  
                  <div className="task-actions">
                    <button className="task-btn edit" onClick={() => openModal(task)} aria-label="Edit task">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button className="task-btn delete" onClick={() => askDelete(task.id)} aria-label="Delete task">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`empty-state ${filteredTasks.length === 0 ? "visible" : ""}`}>
          <div className="empty-illustration">
            <svg viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="80" fill="var(--surface2)" />
              <path d="M70 100l20 20 40-40" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="140" cy="60" r="12" fill="var(--accent2)" />
            </svg>
          </div>
          <h3>{search ? "No Results" : filter !== "all" ? "Nothing Here" : "No Tasks Yet"}</h3>
          <p>
            {search ? `No tasks match "${search}".` :
             filter === "done" ? "No completed tasks yet." :
             filter === "overdue" ? "Great! No overdue tasks." :
             filter === "today" ? "No tasks due today!" :
             filter === "upcoming" ? "No upcoming tasks." :
             "Ready to be productive?"}
          </p>
          {!search && filter === "all" && (
            <button className="empty-cta" onClick={() => openModal()}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Task
            </button>
          )}
        </div>

        <footer className="app-footer">
          <p>TaskFlow &middot; Stay productive</p>
          <div className="footer-stats">
            <span>{stats.total} tasks</span>
            <span>&middot;</span>
            <span>{progressPct}% done</span>
            <span>&middot;</span>
            <span>{stats.overdue} overdue</span>
          </div>
        </footer>
      </div>

      {activeContextMenu && (
        <div 
          className="context-menu"
          style={{ top: Math.min(activeContextMenu.y, window.innerHeight - 200), left: Math.min(activeContextMenu.x, window.innerWidth - 180) }}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          <button onClick={() => { openModal(tasks.find(t => t.id === activeContextMenu.id)); setActiveContextMenu(null); }} role="menuitem">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button onClick={() => duplicateTask(tasks.find(t => t.id === activeContextMenu.id))} role="menuitem">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Duplicate
          </button>
          <button onClick={() => toggleDone(activeContextMenu.id)} role="menuitem">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {tasks.find(t => t.id === activeContextMenu.id)?.done ? "Undo" : "Complete"}
          </button>
          <div className="context-menu-divider"></div>
          <button className="danger" onClick={() => askDelete(activeContextMenu.id)} role="menuitem">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </>
  );
};

export default App;
