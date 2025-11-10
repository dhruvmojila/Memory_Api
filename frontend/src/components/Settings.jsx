import React, { useState } from "react";

const Settings = () => {
  const [apiKey, setApiKey] = useState("");
  const [notifications, setNotifications] = useState(true);

  const handleSave = () => {
    // Save settings logic here
    alert("Settings saved!");
  };

  return (
    <div className="bg-white">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-4">
        Settings
      </h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={notifications}
            onChange={() => setNotifications(!notifications)}
          />
          <label className="ml-2 block text-sm text-gray-900">
            Enable Notifications
          </label>
        </div>
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;
