import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { useNotification } from "../../context/NotificationContext";
import { sessionAPI } from "../../services/api";

const SessionManagement = () => {
  const { sessionName, setSessionName, addDebugInfo } = useApp();
  const { showStatus } = useNotification();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(null);
  const sessionCheckInterval = useRef(null);
  const qrFrameRef = useRef(null);

  // Pindahkan refreshSessions ke dalam useEffect untuk mencegah infinite loop
  useEffect(() => {
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
          response.data &&
          response.data.sessions &&
          Array.isArray(response.data.sessions)
        ) {
          sessionList = response.data.sessions;
        } else if (
          typeof response.data === "object" &&
          response.data !== null
        ) {
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

    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - hanya dijalankan sekali saat mount

  // Buat fungsi refreshSessions terpisah untuk dipanggil manual
  const manualRefreshSessions = useCallback(async () => {
    setSessions(["Memuat..."]);

    try {
      const response = await sessionAPI.getSessions();
      addDebugInfo(
        `📊 Manual refresh sessions response: ${JSON.stringify(response.data)}`
      );

      let sessionList = [];
      if (Array.isArray(response.data)) {
        sessionList = response.data;
      } else if (
        response.data &&
        response.data.sessions &&
        Array.isArray(response.data.sessions)
      ) {
        sessionList = response.data.sessions;
      } else if (typeof response.data === "object" && response.data !== null) {
        sessionList = Object.keys(response.data);
      }

      if (sessionList.length === 0) {
        setSessions(["Tidak ada sesi aktif"]);
      } else {
        setSessions(sessionList);
      }
    } catch (error) {
      console.error("Manual refresh sessions error:", error);
      addDebugInfo(`❌ Manual refresh sessions error: ${error.message}`);
      setSessions(["Gagal memuat daftar sesi"]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Tanpa dependency addDebugInfo

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
        } else if (
          typeof sessionCheck.data === "object" &&
          sessionCheck.data !== null
        ) {
          activeSessions = Object.keys(sessionCheck.data);
        }

        if (activeSessions.includes(sessionName)) {
          showStatus(
            `✅ Sesi "${sessionName}" sudah aktif dan terhubung!`,
            "success"
          );
          manualRefreshSessions();
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
      manualRefreshSessions();

      // Auto show QR code after starting session
      if (!qrVisible) {
        setTimeout(() => {
          showQRCode();
        }, 1000);
      }
    } catch (error) {
      console.error("Start session error:", error);
      addDebugInfo(`❌ Start session error: ${error.message}`);

      // Fixed error handling - no more .includes() on non-string
      let errorMessage = "";
      try {
        if (error.response && error.response.data) {
          if (typeof error.response.data === "string") {
            errorMessage = error.response.data;
          } else if (typeof error.response.data === "object") {
            errorMessage = JSON.stringify(error.response.data);
          }
        } else {
          errorMessage = error.message || "Unknown error";
        }
      } catch (parseError) {
        errorMessage = error.message || "Unknown error";
      }

      if (
        errorMessage.toLowerCase().includes("session already exist") ||
        errorMessage.toLowerCase().includes("already")
      ) {
        showStatus(
          `⚠️ Sesi "${sessionName}" sudah ada. Menampilkan QR code untuk koneksi...`,
          "info"
        );
        manualRefreshSessions();
        setTimeout(() => {
          showQRCode();
        }, 500);
        setSessionStatus(
          `Menunggu scan QR code untuk sesi "${sessionName}"...`
        );
        startSessionMonitoring(sessionName);
      } else {
        showStatus(`❌ Gagal memulai sesi: ${errorMessage}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const showQRCode = () => {
    setQrVisible(true);
    const qrUrl = `${
      process.env.REACT_APP_API_URL || "http://localhost:5001"
    }/session/start?session=${sessionName}`;

    addDebugInfo(`🔗 Preparing QR URL: ${qrUrl}`);

    // Set iframe src
    setTimeout(() => {
      if (qrFrameRef.current) {
        qrFrameRef.current.src = qrUrl;
        addDebugInfo(`📱 QR iframe src set to: ${qrUrl}`);
      }
    }, 200);

    setSessionStatus(`Menunggu scan QR code untuk sesi "${sessionName}"...`);
    startSessionMonitoring(sessionName);
  };

  const hideQRCode = () => {
    setQrVisible(false);
    if (qrFrameRef.current) {
      qrFrameRef.current.src = "";
    }
    setSessionStatus(null);
    stopSessionMonitoring();
    addDebugInfo(`🙈 QR code hidden`);
  };

  const refreshQRCode = () => {
    if (qrFrameRef.current && qrVisible) {
      const qrUrl = `${
        process.env.REACT_APP_API_URL || "http://localhost:5001"
      }/session/start?session=${sessionName}&t=${Date.now()}`;
      qrFrameRef.current.src = qrUrl;
      addDebugInfo(`🔄 QR code refreshed: ${qrUrl}`);
      showStatus(`🔄 QR code di-refresh`, "info");
    }
  };

  const logoutSession = async () => {
    setLoading(true);

    try {
      await sessionAPI.logoutSession(sessionName);
      showStatus(`✅ Sesi "${sessionName}" berhasil logout`, "success");
      manualRefreshSessions();
      setSessionStatus(null);
      stopSessionMonitoring();

      if (qrVisible) {
        hideQRCode();
      }
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
          } else if (
            typeof response.data === "object" &&
            response.data !== null
          ) {
            activeSessions = Object.keys(response.data);
          }

          if (activeSessions.includes(sessionName)) {
            showStatus(
              `🎉 Sesi "${sessionName}" berhasil terhubung! WhatsApp berhasil di-connect.`,
              "success"
            );
            setSessionStatus(`Sesi "${sessionName}" aktif dan siap digunakan!`);
            manualRefreshSessions();
            stopSessionMonitoring();

            setTimeout(() => {
              if (qrVisible) {
                hideQRCode();
              }
            }, 3000);
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
    return () => {
      stopSessionMonitoring();
    };
  }, []);

  return (
    <div className="main-card p-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Manajemen Sesi WhatsApp
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label
            htmlFor="sessionName"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
          >
            Nama Sesi
          </label>
          <input
            type="text"
            id="sessionName"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="mysession"
            className="form-input w-full"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={manualRefreshSessions}
            className="btn-primary w-full"
          >
            🔄 Refresh Daftar Sesi
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={startSession}
          disabled={loading}
          className="btn-success"
        >
          {loading ? "⏳ Memulai..." : "🚀 Mulai Sesi Baru"}
        </button>
        <button
          onClick={qrVisible ? hideQRCode : showQRCode}
          className="btn-primary"
        >
          {qrVisible ? "🙈 Sembunyikan QR Code" : "👁️ Tampilkan QR Code"}
        </button>
        <button
          onClick={logoutSession}
          disabled={loading}
          className="btn-danger"
        >
          {loading ? "⏳ Logout..." : "🚪 Logout Sesi"}
        </button>
      </div>

      {/* Session Status Indicator */}
      {sessionStatus && (
        <div className="mb-6 p-4 rounded-xl border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex items-center">
            <div className="pulse-dot w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
            <span className="text-blue-800 dark:text-blue-200 text-sm font-semibold">
              {sessionStatus}
            </span>
          </div>
        </div>
      )}

      {/* QR Code Display */}
      {qrVisible && (
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                📱 Scan QR Code dengan WhatsApp
              </h3>
              <button
                onClick={refreshQRCode}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🔄 Refresh QR
              </button>
            </div>

            <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <iframe
                ref={qrFrameRef}
                className="w-full border-0"
                style={{ height: "500px", minHeight: "400px" }}
                title="QR Code"
                sandbox="allow-same-origin allow-scripts"
                onLoad={() => {
                  addDebugInfo("📱 QR Frame loaded successfully");
                  showStatus("📱 QR code berhasil dimuat", "success");
                }}
                onError={(e) => {
                  addDebugInfo("❌ QR Frame failed to load");
                  showStatus(
                    "❌ Gagal memuat QR code. Periksa koneksi backend.",
                    "error"
                  );
                }}
              />
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                📱 Buka WhatsApp → Menu (⋮) → Linked Devices → Link a Device →
                Scan QR code di atas
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
                Sesi: <strong>{sessionName}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📋 Sesi Aktif:
        </h3>
        <div className="text-gray-600 dark:text-gray-400">
          {Array.isArray(sessions) && sessions.length > 0 ? (
            sessions.map((session, index) => (
              <span
                key={index}
                className="inline-block bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-4 py-2 rounded-full text-sm mr-3 mb-2 font-semibold border border-green-200 dark:border-green-700"
              >
                🟢 {session}
              </span>
            ))
          ) : (
            <span className="text-gray-500 dark:text-gray-400">
              Memuat daftar sesi...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionManagement;
