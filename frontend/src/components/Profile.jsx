import React, { useState } from "react";

const Profile = () => {
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john.doe@example.com");
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    // Save profile logic here
    alert("Profile updated!");
  };

  return (
    <div className="bg-white">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-4">
        User Profile
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name
          </label>
          {isEditing ? (
            <input
              type="text"
              className="w-full px-4 py-3 text-gray-700 border rounded-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          ) : (
            <p className="text-lg text-gray-900">{name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          {isEditing ? (
            <input
              type="email"
              className="w-full px-4 py-3 text-gray-700 border rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          ) : (
            <p className="text-lg text-gray-900">{email}</p>
          )}
        </div>
        {isEditing ? (
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg"
          >
            Save
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg"
          >
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );
};

export default Profile;
