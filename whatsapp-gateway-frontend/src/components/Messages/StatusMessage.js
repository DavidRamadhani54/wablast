import React from "react";
import { useNotification } from "../../context/NotificationContext";

const StatusMessage = () => {
  const { notification, hideStatus } = useNotification();

  if (!notification) return null;

  const getStatusClass = () => {
    let className = "mt-6 p-6 rounded-xl fade-in ";

    if (notification.type === "success") {
      className += "status-success";
    } else if (notification.type === "error") {
      className += "status-error";
    } else if (notification.type === "info") {
      className += "status-info";
    }

    return className;
  };

  return (
    <div className={getStatusClass()}>
      <div className="flex justify-between items-start">
        <span>{notification.message}</span>
        <button
          onClick={hideStatus}
          className="ml-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default StatusMessage;
