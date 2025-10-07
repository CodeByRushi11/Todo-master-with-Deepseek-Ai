import React from "react";

const WelcomeMessage = () => {
  return (
    <div className="text-center py-16">
      <div className="max-w-md mx-auto">
        <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg
            className="w-16 h-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-3xl font-bold text-gray-700 mb-4">No Tasks Yet!</h3>
        <p className="text-lg text-gray-500 mb-6">
          Start by adding your first task to get organized and boost your
          productivity.
        </p>
        <div className="text-4xl">✨</div>
      </div>
    </div>
  );
};

export default WelcomeMessage;
