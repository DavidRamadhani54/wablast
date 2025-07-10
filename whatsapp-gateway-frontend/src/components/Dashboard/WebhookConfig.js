import React, { useState } from "react";

const WebhookConfig = () => {
  const [webhookUrl, setWebhookUrl] = useState("");

  return (
    <div className="main-card p-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        🪝 Konfigurasi Webhook
      </h2>
      <div className="space-y-6">
        <div>
          <label
            htmlFor="webhookUrl"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
          >
            Webhook Base URL
          </label>
          <input
            type="url"
            id="webhookUrl"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="http://yourdomain.com/webhook"
            className="form-input w-full"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Set WEBHOOK_BASE_URL di environment variable atau .env file
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="feature-card service-tier-2 p-5">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              Session Webhook
            </h4>
            <code className="text-xs text-blue-600 dark:text-blue-300 block mb-2">
              POST /webhook/session
            </code>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              Status: connected/disconnected/connecting
            </p>
          </div>
          <div className="feature-card service-tier-1 p-5">
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              Message Webhook
            </h4>
            <code className="text-xs text-green-600 dark:text-green-300 block mb-2">
              POST /webhook/message
            </code>
            <p className="text-xs text-green-600 dark:text-green-300">
              Incoming messages & media
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhookConfig;
