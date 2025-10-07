import { useState } from "react";

const ItemsTodo = ({
  todoItems,
  onDeleteClick,
  onEditClick,
  setEditingIndex,
  editingIndex,
}) => {
  const [tempName, setTempName] = useState("");
  const [tempDate, setTempDate] = useState("");

  const handleSave = (index) => {
    if (tempName.trim() === "") {
      alert("Please enter a task name!");
      return;
    }
    onEditClick(index, tempName, tempDate);
    setEditingIndex(null);
  };

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getTimeStatus = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;
    const hours = diff / (1000 * 60 * 60);

    if (hours < 0) return { text: "Overdue", color: "bg-red-500" };
    if (hours < 24) return { text: "Today", color: "bg-orange-500" };
    if (hours < 48) return { text: "Tomorrow", color: "bg-yellow-500" };
    return { text: "Upcoming", color: "bg-green-500" };
  };

  return (
    <div className="space-y-4">
      {todoItems.map((item, index) => {
        const timeStatus = getTimeStatus(item.dueDate);

        return (
          <div
            key={index}
            className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden"
          >
            {/* View Mode */}
            <div
              className={`p-6 transition-all duration-300 ${
                editingIndex === index ? "hidden" : "block"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-3 h-12 rounded-full ${timeStatus.color} mt-1`}
                    ></div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg mb-1">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm text-gray-600 flex items-center">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {formatDateTime(item.dueDate)}
                        </span>
                        <span
                          className={`text-xs font-semibold text-white px-3 py-1 rounded-full ${timeStatus.color}`}
                        >
                          {timeStatus.text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-200 transform hover:scale-105"
                    onClick={() => {
                      setEditingIndex(index);
                      setTempName(item.name);
                      setTempDate(item.dueDate.slice(0, 16));
                    }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    className="bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-4 focus:ring-red-200 transition-all duration-200 transform hover:scale-105"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete this task?"
                        )
                      ) {
                        onDeleteClick(index);
                      }
                    }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Edit Mode */}
            <div
              className={`p-6 transition-all duration-300 ${
                editingIndex === index ? "block" : "hidden"
              }`}
            >
              <div className="flex flex-col lg:flex-row gap-4 items-end">
                <div className="flex-1 space-y-4 w-full">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="Edit task name"
                  />
                  <input
                    type="datetime-local"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                  <button
                    className="flex-1 bg-green-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-4 focus:ring-green-200 transition-all duration-200 flex items-center justify-center gap-2"
                    onClick={() => handleSave(index)}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save
                  </button>
                  <button
                    className="flex-1 bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200 flex items-center justify-center gap-2"
                    onClick={() => setEditingIndex(null)}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ItemsTodo;
