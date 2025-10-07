import { useEffect, useState } from "react";
import AppName from "./Component/AppName";
import AddTodo from "./Component/AddTodo";
import ItemsTodo from "./Component/ItemsTodo";
import WelcomeMessage from "./Component/WelcomeMessage";

const App = () => {
  const [todoItem, setTodoItem] = useState(() => {
    const savedTodos = localStorage.getItem("todos");
    return savedTodos ? JSON.parse(savedTodos) : [];
  });

  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todoItem));
  }, [todoItem]);

  const handleAddNewItem = (itemName, itemDueDate) => {
    if (itemName.trim() === "" || itemDueDate === "") {
      alert("Please enter both task name and due date!");
      return;
    }
    const newTodoItem = [...todoItem, { name: itemName, dueDate: itemDueDate }];
    setTodoItem(newTodoItem);
  };

  const handleDeleteItem = (deleteIndex) => {
    const newTodoItem = todoItem.filter((_, index) => index !== deleteIndex);
    setTodoItem(newTodoItem);
  };

  const handleEditItem = (index, newName, newDate) => {
    const updatedTodos = [...todoItem];
    updatedTodos[index] = { name: newName, dueDate: newDate };
    setTodoItem(updatedTodos);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <AppName />
        <AddTodo oneNewItem={handleAddNewItem} />
        {todoItem.length === 0 && <WelcomeMessage />}
        {todoItem.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <svg
                  className="w-6 h-6 mr-2 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                Your Tasks ({todoItem.length})
              </h2>
            </div>
            <ItemsTodo
              todoItems={todoItem}
              onDeleteClick={handleDeleteItem}
              onEditClick={handleEditItem}
              setEditingIndex={setEditingIndex}
              editingIndex={editingIndex}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
