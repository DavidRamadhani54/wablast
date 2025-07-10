import { useState, useEffect, useRef } from "react";
import { sessionAPI } from "../services/api";
import { useApp } from "../context/AppContext";
import { useNotification } from "../context/NotificationContext";

export const useSession = () => {
  const { sessionName, addDebugInfo } = useApp();
  const { showStatus } = useNotification();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(null);
  const sessionCheckInterval = useRef(null);

  const refreshSessions = async () => {
    setSessions(["Memuat..."]);

    try {
      const response = await sessionAPI.getSessions();
      addDebugInfo(
        `📊 Refresh sessions response: ${JSON.stringify(response.data)}`
      );

      let sessionList = [];
      if (Array.isArray(response.data)) {
        sessionList = response.data;
      } else if (
        response.data.sessions &&
        Array.isArray(response.data.sessions)
      ) {
        sessionList = response.data.sessions;
      } else if (typeof response.data === "object") {
        sessionList = Object.keys(response.data);
      }

      if (sessionList.length === 0) {
        setSessions(["Tidak ada sesi aktif"]);
      } else {
        setSessions(sessionList);
      }
    } catch (error) {
      console.error("Refresh sessions error:", error);
      addDebugInfo(`❌ Refresh sessions error: ${error.message}`);
      setSessions(["Gagal memuat daftar sesi"]);
    }
  };

  const startSession = async () => {
    setLoading(true);

    try {
      // Check if session already exists
      const sessionCheck = await sessionAPI.getSessions();
      if (sessionCheck.data) {
        let activeSessions = [];
        if (Array.isArray(sessionCheck.data)) {
          activeSessions = sessionCheck.data;
        } else if (
          sessionCheck.data.sessions &&
          Array.isArray(sessionCheck.data.sessions)
        ) {
          activeSessions = sessionCheck.data.sessions;
        } else if (typeof sessionCheck.data === "object") {
          activeSessions = Object.keys(sessionCheck.data);
        }

        if (activeSessions.includes(sessionName)) {
          showStatus(
            `✅ Sesi "${sessionName}" sudah aktif dan terhubung!`,
            "success"
          );
          refreshSessions();
          setLoading(false);
          return;
        }
      }

      const response = await sessionAPI.startSession(sessionName);
      addDebugInfo(
        `📊 Start session response: ${JSON.stringify(response.data)}`
      );

      showStatus(
        `✅ Sesi "${sessionName}" berhasil dimulai. Silakan scan QR code untuk melanjutkan.`,
        "success"
      );
      refreshSessions();
    } catch (error) {
      console.error("Start session error:", error);
      addDebugInfo(`❌ Start session error: ${error.message}`);

      if (error.response?.data?.includes("Session already exist")) {
        showStatus(
          `⚠️ Sesi "${sessionName}" sudah ada. Menampilkan QR code untuk koneksi...`,
          "info"
        );
        refreshSessions();
        setSessionStatus(
          `Menunggu scan QR code untuk sesi "${sessionName}"...`
        );
        startSessionMonitoring(sessionName);
      } else {
        showStatus(`❌ Gagal memulai sesi: ${error.message}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const logoutSession = async () => {
    setLoading(true);

    try {
      await sessionAPI.logoutSession(sessionName);
      showStatus(`✅ Sesi "${sessionName}" berhasil logout`, "success");
      refreshSessions();
      setSessionStatus(null);
      stopSessionMonitoring();
    } catch (error) {
      console.error("Logout session error:", error);
      showStatus(`❌ Gagal logout sesi: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const startSessionMonitoring = (sessionName) => {
    stopSessionMonitoring();

    sessionCheckInterval.current = setInterval(async () => {
      try {
        const response = await sessionAPI.getSessions();
        if (response.data) {
          let activeSessions = [];
          if (Array.isArray(response.data)) {
            activeSessions = response.data;
          } else if (
            response.data.sessions &&
            Array.isArray(response.data.sessions)
          ) {
            activeSessions = response.data.sessions;
          } else if (typeof response.data === "object") {
            activeSessions = Object.keys(response.data);
          }

          if (activeSessions.includes(sessionName)) {
            showStatus(
              `🎉 Sesi "${sessionName}" berhasil terhubung! WhatsApp berhasil di-connect.`,
              "success"
            );
            setSessionStatus(`Sesi "${sessionName}" aktif dan siap digunakan!`);
            refreshSessions();
            stopSessionMonitoring();
          }
        }
      } catch (error) {
        console.log("Error checking session status:", error);
      }
    }, 4000);
  };

  const stopSessionMonitoring = () => {
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
      sessionCheckInterval.current = null;
    }
  };

  useEffect(() => {
    refreshSessions();

    return () => {
      stopSessionMonitoring();
    };
  }, []);

  return {
    sessions,
    loading,
    sessionStatus,
    setSessionStatus,
    refreshSessions,
    startSession,
    logoutSession,
    startSessionMonitoring,
    stopSessionMonitoring,
  };
};
