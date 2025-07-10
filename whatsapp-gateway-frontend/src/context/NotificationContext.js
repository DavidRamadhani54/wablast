import React, { createContext, useContext, useState } from "react";

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const showStatus = (message, type = "info") => {
    setNotification({ message, type });

    // Auto hide after 15 seconds
    setTimeout(() => {
      setNotification(null);
    }, 15000);
  };

  const hideStatus = () => {
    setNotification(null);
  };

  const value = {
    notification,
    showStatus,
    hideStatus,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
