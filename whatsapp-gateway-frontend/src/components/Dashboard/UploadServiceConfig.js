import React, { useState } from "react";
import { useApp } from "../../context/AppContext";

const UploadServiceConfig = () => {
  const { uploadService, setUploadService } = useApp();
  const [customUrl, setCustomUrl] = useState("");

  const handleServiceChange = (e) => {
    const value = e.target.value;
    setUploadService(value);
  };

  return (
    <div className="main-card p-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Konfigurasi Upload Service
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="uploadService"
            className="block text-sm font-semibold text-green-700 dark:text-green-300 mb-3"
          >
            Upload Strategy (TESTED & WORKING)
          </label>
          <select
            id="uploadService"
            value={uploadService}
            onChange={handleServiceChange}
            className="form-input w-full"
          >
            <option value="auto">
              🤖 AUTO-SELECT (Tests working services only)
            </option>
            <option value="tmpfiles"> TmpFiles </option>
            <option value="file-io"> File.io </option>
            <option value="transfer-sh"> Transfer.sh </option>
            <option value="up1"> Up1.ca </option>
            <option value="uguu"> Uguu.se </option>
            <option value="pomf2"> Pomf2 </option>
            <option value="imgur-direct"> Imgur </option>
          </select>
        </div>
        {uploadService === "custom" && (
          <div>
            <label
              htmlFor="customUrl"
              className="block text-sm font-semibold text-green-700 dark:text-green-300 mb-3"
            >
              Custom Upload URL
            </label>
            <input
              type="url"
              id="customUrl"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://yourserver.com/upload"
              className="form-input w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadServiceConfig;
