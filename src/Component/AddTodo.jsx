import { useState } from "react";

const AddTodo = ({ oneNewItem }) => {
  const [todoName, setTodoName] = useState("");
  const [todoDueDate, setTodoDueDate] = useState("");

  const handleAddButton = () => {
    if (todoName.trim() === "" || todoDueDate === "") {
      alert("Please enter both task name and due date!");
      return;
    }
    oneNewItem(todoName, todoDueDate);
    setTodoDueDate("");
    setTodoName("");
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      handleAddButton();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center justify-center">
        <svg
          className="w-6 h-6 mr-2 text-green-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        Add New Task
      </h2>

      <div className="flex flex-col lg:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Task Name
          </label>
          <input
            type="text"
            placeholder="What needs to be done?"
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
            value={todoName}
            onChange={(e) => setTodoName(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Due Date
          </label>
          <input
            type="datetime-local"
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
            value={todoDueDate}
            onChange={(e) => setTodoDueDate(e.target.value)}
          />
        </div>

        <button
          className="w-full lg:w-auto bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-8 rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-300 transform hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
          onClick={handleAddButton}
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Task
        </button>
      </div>
    </div>
  );
};

export default AddTodo;
