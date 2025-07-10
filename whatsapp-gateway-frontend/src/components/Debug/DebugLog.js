import React from "react";
import { useApp } from "../../context/AppContext";

const DebugLog = () => {
  const { debugLogs, clearDebugLogs } = useApp();

  return (
    <div className="main-card p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          🔧 Debug Log
        </h2>
        <button onClick={clearDebugLogs} className="btn-danger">
          🗑️ Clear Log
        </button>
      </div>

      <div>
        <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-auto max-h-96 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600">
          {debugLogs.join("")}
        </pre>
      </div>
    </div>
  );
};

export default DebugLog;
