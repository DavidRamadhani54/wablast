import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useNotification } from "../../context/NotificationContext";
import { messageAPI } from "../../services/api";
import { getErrorMessage } from "../../utils/helpers";

const BlastResults = () => {
  const {
    blastResults,
    setBlastResults,
    blastInProgress,
    customBlastInProgress,
    // Retry blast support
    lastBlastConfig,
    isRetryBlast,
    setIsRetryBlast,
    contacts,
    processTemplateForBlast,
    processCustomBlastTemplate,
    sessionName,
    addDebugInfo,
    addMessageLog,
    clearLogs,
  } = useApp();

  const { showStatus } = useNotification();

  // FIXED: State for tracking progress properly
  const [currentProgress, setCurrentProgress] = useState({
    current: 0,
    total: 0,
  });
  const [lastCompletedBlast, setLastCompletedBlast] = useState(null);

  // FIXED: Monitor blast results changes for better progress tracking
  useEffect(() => {
    const totalProcessed = blastResults.success + blastResults.failed;
    const total = blastResults.total;

    setCurrentProgress({ current: totalProcessed, total: total });

    // FIXED: Detect when blast is completed and show proper notification
    if (
      total > 0 &&
      totalProcessed === total &&
      !blastInProgress &&
      !customBlastInProgress
    ) {
      const successRate =
        total > 0 ? ((blastResults.success / total) * 100).toFixed(1) : 0;

      // Only show completion notification once
      const blastId = `${total}-${blastResults.success}-${blastResults.failed}`;
      if (lastCompletedBlast !== blastId) {
        setLastCompletedBlast(blastId);

        // FIXED: Enhanced completion notification with full details
        const blastType = lastBlastConfig?.isCustomBlast
          ? "Custom Blast"
          : "Smart Blast";
        const completionMessage = `🎉 ${blastType} selesai! Berhasil: ${blastResults.success}/${total} (${successRate}%)`;

        if (blastResults.failed > 0) {
          showStatus(
            `${completionMessage}. Gagal: ${blastResults.failed} pesan.`,
            blastResults.success > blastResults.failed ? "success" : "warning"
          );
        } else {
          showStatus(completionMessage, "success");
        }

        addDebugInfo(
          `📊 BLAST COMPLETED: ${blastType} - Success: ${blastResults.success}/${total} (${successRate}%), Failed: ${blastResults.failed}`
        );
      }
    }
  }, [
    blastResults,
    blastInProgress,
    customBlastInProgress,
    lastCompletedBlast,
    lastBlastConfig,
    showStatus,
    addDebugInfo,
  ]);

  // Enhanced retry failed blast functionality
  const retryFailedBlast = async () => {
    if (!lastBlastConfig || blastResults.failedNumbers.length === 0) {
      showStatus("❌ Tidak ada blast yang gagal untuk diulangi", "error");
      return;
    }

    // Create custom confirmation dialog
    const confirmed = await showConfirmDialog(
      `Apakah Anda yakin ingin mengirim ulang ${blastResults.failedNumbers.length} pesan yang gagal?`,
      `Pesan akan dikirim ulang hanya ke nomor yang benar-benar gagal.`
    );

    if (!confirmed) return;

    setIsRetryBlast(true);

    try {
      const {
        blastType,
        blastMessage,
        blastDelay,
        fileUrl,
        fileName,
        isCustomBlast,
      } = lastBlastConfig;

      const failedNumbers = [...blastResults.failedNumbers];
      let retrySuccess = 0;
      let retryFailed = 0;
      const retryErrors = [];

      addDebugInfo(
        `🔄 RETRY BLAST: Starting retry for ${failedNumbers.length} failed numbers`
      );
      showStatus(
        `🔄 Memulai retry untuk ${failedNumbers.length} nomor yang gagal...`,
        "info"
      );

      for (let i = 0; i < failedNumbers.length; i++) {
        const phoneNumber = failedNumbers[i];

        try {
          addDebugInfo(
            `🔄 RETRY: Attempting to send to ${phoneNumber} (${i + 1}/${
              failedNumbers.length
            })`
          );

          // Process template for retry
          let personalizedMessage;
          if (isCustomBlast) {
            personalizedMessage = processCustomBlastTemplate(
              blastMessage,
              phoneNumber
            );
          } else {
            personalizedMessage = processTemplateForBlast(
              blastMessage,
              phoneNumber
            );
          }

          let messagePayload = {
            session: sessionName,
            to: phoneNumber,
            text: personalizedMessage || "",
            is_group: false,
          };

          let response;
          if (blastType === "text") {
            response = await messageAPI.sendText(messagePayload);
          } else if (blastType === "image") {
            messagePayload.image_url = fileUrl;
            response = await messageAPI.sendImage(messagePayload);
          } else if (blastType === "document") {
            messagePayload.document_url = fileUrl;
            messagePayload.document_name = fileName || "document";
            response = await messageAPI.sendDocument(messagePayload);
          }

          // FIXED: Enhanced success validation for retry
          if (response && (response.status < 400 || response.data?.timeout)) {
            retrySuccess++;
            const contact = contacts.find((c) => c.phone === phoneNumber);
            const contactInfo = contact ? ` (${contact.name})` : "";

            // Update the main blast results to reflect successful retry
            setBlastResults((prev) => ({
              ...prev,
              success: prev.success + 1,
              failed: Math.max(0, prev.failed - 1),
              failedNumbers: prev.failedNumbers.filter(
                (num) => num !== phoneNumber
              ),
            }));

            addMessageLog(
              phoneNumber,
              "success",
              personalizedMessage,
              `✅ RETRY berhasil via ${blastType}${contactInfo}${
                response.data?.timeout ? " (timeout resolved)" : ""
              }`
            );
            addDebugInfo(`✅ RETRY: Success to ${phoneNumber}`);
          } else {
            throw new Error(
              getErrorMessage(response) ||
                `HTTP ${response?.status || "Unknown"}`
            );
          }
        } catch (error) {
          retryFailed++;
          const contact = contacts.find((c) => c.phone === phoneNumber);
          const contactInfo = contact ? ` (${contact.name})` : "";

          const errorMsg = getErrorMessage(error);
          retryErrors.push(`${phoneNumber}: ${errorMsg}`);

          addMessageLog(
            phoneNumber,
            "error",
            blastMessage,
            `❌ RETRY masih gagal: ${errorMsg}${contactInfo}`
          );
          addDebugInfo(`❌ RETRY: Failed to ${phoneNumber}: ${errorMsg}`);
        }

        // Delay between messages (except for last one)
        if (i < failedNumbers.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, blastDelay * 1000)
          );
        }
      }

      const successRate =
        retrySuccess > 0
          ? ((retrySuccess / failedNumbers.length) * 100).toFixed(1)
          : 0;

      // Enhanced retry completion notification
      if (retrySuccess > 0) {
        showStatus(
          `🔄 Retry selesai! Berhasil: ${retrySuccess}/${failedNumbers.length} (${successRate}%). Masih gagal: ${retryFailed}`,
          "success"
        );
      } else {
        showStatus(
          `🔄 Retry selesai tapi semua masih gagal. Cek koneksi WhatsApp dan nomor tujuan.`,
          "error"
        );
      }

      addDebugInfo(
        `🔄 RETRY BLAST: Completed. Success: ${retrySuccess}, Still failed: ${retryFailed}`
      );

      if (retryErrors.length > 0) {
        addDebugInfo(`🔄 RETRY ERRORS: ${retryErrors.join(", ")}`);
      }
    } catch (error) {
      console.error("Retry blast error:", error);
      showStatus(`❌ Retry blast gagal: ${getErrorMessage(error)}`, "error");
      addDebugInfo(`❌ RETRY BLAST: Critical error: ${getErrorMessage(error)}`);
    } finally {
      setIsRetryBlast(false);
    }
  };

  // Enhanced confirmation dialog
  const showConfirmDialog = (message, description = "") => {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className =
        "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
      modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div class="text-center mb-4">
            <div class="text-4xl mb-2">🔄</div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Konfirmasi Retry</h3>
          </div>
          <p class="text-gray-700 dark:text-gray-300 mb-2">${message}</p>
          ${
            description
              ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">${description}</p>`
              : ""
          }
          <div class="flex justify-end space-x-3">
            <button class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" onclick="this.closest('.fixed').remove(); window.confirmResult(false)">Batal</button>
            <button class="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded" onclick="this.closest('.fixed').remove(); window.confirmResult(true)">Ya, Kirim Ulang</button>
          </div>
        </div>
      `;

      window.confirmResult = (result) => {
        resolve(result);
        delete window.confirmResult;
      };

      document.body.appendChild(modal);
    });
  };

  // FIXED: Calculate progress percentage correctly
  const getProgressPercentage = () => {
    if (currentProgress.total === 0) return 0;
    return Math.round((currentProgress.current / currentProgress.total) * 100);
  };

  // FIXED: Get current blast status
  const getCurrentBlastStatus = () => {
    if (blastInProgress || customBlastInProgress) {
      const remaining = currentProgress.total - currentProgress.current;
      return `Sedang mengirim ke ${currentProgress.current}/${currentProgress.total} nomor... (${remaining} tersisa)`;
    } else if (
      currentProgress.total > 0 &&
      currentProgress.current === currentProgress.total
    ) {
      const successRate =
        currentProgress.total > 0
          ? ((blastResults.success / currentProgress.total) * 100).toFixed(1)
          : 0;
      return `Blast selesai! Berhasil: ${blastResults.success}/${currentProgress.total} (${successRate}%)`;
    }
    return "Tidak ada blast yang sedang berjalan";
  };

  if (blastResults.total === 0 && !blastInProgress && !customBlastInProgress)
    return null;

  return (
    <div className="main-card p-8 mb-8 fade-in">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        📊 Hasil Blast & Log Pesan
      </h3>

      {/* FIXED: Enhanced Progress Section */}
      {(blastInProgress ||
        customBlastInProgress ||
        currentProgress.total > 0) && (
        <div
          className="feature-card p-6 mb-6"
          style={{
            background: "linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)",
            borderColor: "#0288d1",
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold text-blue-800 dark:text-blue-200">
              📈 Progress Blast
            </h4>
            <span className="text-sm text-blue-600 dark:text-blue-300 font-semibold">
              {getProgressPercentage()}%
            </span>
          </div>

          <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-6 overflow-hidden mb-4">
            <div
              className="progress-bar h-6 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-cyan-500"
              style={{
                width: `${getProgressPercentage()}%`,
              }}
            ></div>
          </div>

          <p className="text-sm text-blue-700 dark:text-blue-300 text-center font-medium">
            {getCurrentBlastStatus()}
          </p>

          {(blastInProgress || customBlastInProgress) && (
            <div className="flex justify-center mt-4">
              <div className="loading-spinner-large"></div>
            </div>
          )}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="feature-card service-tier-1 p-6 text-center">
          <h4 className="text-lg font-bold text-green-800 dark:text-green-200 mb-2">
            ✅ Berhasil
          </h4>
          <p className="text-3xl font-bold text-green-600">
            {blastResults.success}
          </p>
          {currentProgress.total > 0 && (
            <p className="text-sm text-green-500 mt-1">
              {currentProgress.total > 0
                ? (
                    (blastResults.success / currentProgress.total) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </p>
          )}
        </div>
        <div className="feature-card service-tier-4 p-6 text-center">
          <h4 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
            ❌ Gagal
          </h4>
          <p className="text-3xl font-bold text-red-600">
            {blastResults.failed}
          </p>
          {currentProgress.total > 0 && (
            <p className="text-sm text-red-500 mt-1">
              {currentProgress.total > 0
                ? ((blastResults.failed / currentProgress.total) * 100).toFixed(
                    1
                  )
                : 0}
              %
            </p>
          )}
        </div>
        <div className="feature-card service-tier-2 p-6 text-center">
          <h4 className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-2">
            📊 Total
          </h4>
          <p className="text-3xl font-bold text-blue-600">
            {currentProgress.total}
          </p>
          <p className="text-sm text-blue-500 mt-1">
            {currentProgress.current}/{currentProgress.total} diproses
          </p>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Detail Log Pengiriman ({blastResults.logs.length})
          </h4>
          <div className="flex gap-3">
            {/* Retry Failed Blast Button */}
            {blastResults.failedNumbers.length > 0 &&
              !blastInProgress &&
              !customBlastInProgress && (
                <button
                  onClick={retryFailedBlast}
                  disabled={isRetryBlast}
                  className="btn-warning text-sm px-4 py-2 flex items-center gap-2 transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:opacity-60"
                >
                  {isRetryBlast ? (
                    <>
                      <div className="loading-spinner"></div>
                      Mengirim Ulang...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        ></path>
                      </svg>
                      🔄 Kirim Ulang yang Gagal (
                      {blastResults.failedNumbers.length})
                    </>
                  )}
                </button>
              )}
            <button
              onClick={clearLogs}
              className="btn-danger text-sm px-4 py-2 flex items-center gap-2 transition-all duration-300 hover:scale-105"
              disabled={blastInProgress || customBlastInProgress}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                ></path>
              </svg>
              Hapus Log
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {blastResults.logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                Belum ada log pesan
              </p>
              <p className="text-sm text-gray-400">
                Log akan muncul setelah Anda memulai blast
              </p>
            </div>
          ) : (
            blastResults.logs
              .slice(-50)
              .reverse()
              .map((log, index) => {
                let statusClass = "log-pending";
                let statusIcon = "⏳";

                if (log.status === "success") {
                  statusClass = "log-success";
                  statusIcon = "✅";
                } else if (log.status === "error") {
                  statusClass = "log-error";
                  statusIcon = "❌";
                }

                return (
                  <div
                    key={`${log.phoneNumber}-${log.timestamp}-${index}`}
                    className={`${statusClass} p-4 rounded-xl border dark:border-gray-600 transition-all duration-300 hover:shadow-lg`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{statusIcon}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {log.phoneNumber}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {log.timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          {log.message}
                        </p>
                        {log.details && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {log.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Enhanced CSS */}
      <style jsx>{`
        .loading-spinner {
          border: 2px solid #f3f3f3;
          border-radius: 50%;
          border-top: 2px solid #f59e0b;
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
          display: inline-block;
          margin-right: 8px;
        }

        .loading-spinner-large {
          border: 3px solid #e3f2fd;
          border-radius: 50%;
          border-top: 3px solid #1976d2;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .fade-in {
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .progress-bar {
          background: linear-gradient(90deg, #1976d2, #42a5f5, #64b5f6);
          background-size: 200% 100%;
          animation: progressGradient 2s ease-in-out infinite;
        }

        @keyframes progressGradient {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .log-success {
          border-left: 4px solid #10b981;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        }

        .log-error {
          border-left: 4px solid #ef4444;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        }

        .log-pending {
          border-left: 4px solid #f59e0b;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }

        .btn-warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px 0 rgba(245, 158, 11, 0.39);
          border: none;
          cursor: pointer;
        }

        .btn-warning:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px 0 rgba(245, 158, 11, 0.5);
        }

        .btn-warning:disabled {
          cursor: not-allowed;
          transform: none;
        }

        .service-tier-1 {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f7fa 100%);
          border-color: #10b981;
        }

        .service-tier-2 {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-color: #3b82f6;
        }

        .service-tier-4 {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border-color: #ef4444;
        }
      `}</style>
    </div>
  );
};

export default BlastResults;
