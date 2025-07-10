import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../context/NotificationContext";

const SettingsModal = () => {
  const { currentUser, changePassword, logout } = useAuth();
  const { showStatus } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  React.useEffect(() => {
    // Listen for modal open events
    const modal = document.getElementById("settingsModal");
    if (modal) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "class"
          ) {
            const isHidden = modal.classList.contains("hidden");
            setIsOpen(!isHidden);
          }
        });
      });

      observer.observe(modal, { attributes: true });

      return () => observer.disconnect();
    }
  }, []);

  const closeModal = () => {
    const modal = document.getElementById("settingsModal");
    if (modal) {
      modal.classList.add("hidden");
    }
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (newPassword.length < 6) {
      showStatus("❌ Password baru minimal 6 karakter", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showStatus("❌ Konfirmasi password tidak cocok", "error");
      return;
    }

    setLoading(true);

    setTimeout(async () => {
      const result = await changePassword(currentPassword, newPassword);

      if (result.success) {
        showStatus(
          "✅ Password berhasil diubah! Silakan login ulang untuk keamanan.",
          "success"
        );
        closeModal();

        // Optional: Force re-login for security
        setTimeout(() => {
          logout();
        }, 2000);
      } else {
        showStatus(`❌ ${result.error}`, "error");
      }

      setLoading(false);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div id="settingsModal" className="settings-modal">
      <div className="settings-content">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            ⚙️ Pengaturan Sistem
          </h2>
          <button
            onClick={closeModal}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <svg
              className="w-6 h-6"
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

        <div className="space-y-6">
          {/* User Information */}
          <div className="feature-card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              👤 Informasi Pengguna
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Username:
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {currentUser.username}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Login terakhir:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {currentUser.lastLogin || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Status:
                </span>
                <span className="text-green-600 font-semibold">🟢 Online</span>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="feature-card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              🔐 Ubah Password
            </h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Password Saat Ini
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Masukkan password saat ini"
                  className="form-input w-full"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Password Baru
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Masukkan password baru"
                  className="form-input w-full"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Konfirmasi password baru"
                  className="form-input w-full"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner"></div>
                      Mengubah...
                    </>
                  ) : (
                    "🔐 Ubah Password"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* System Info */}
          <div className="feature-card p-5">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-4">
              ℹ️ Informasi Sistem
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300">
                  Versi Aplikasi:
                </span>
                <span className="text-blue-900 dark:text-blue-100 font-semibold">
                  v2.3.1 + RETRY FAILED BLAST
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300">
                  Build Date:
                </span>
                <span className="text-blue-900 dark:text-blue-100">
                  {new Date().toLocaleDateString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300">
                  Status Server:
                </span>
                <span className="text-green-600 font-semibold">🟢 Aktif</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
