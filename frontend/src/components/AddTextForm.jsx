import React, { useState } from 'react';
import { addTextMemory } from '../services/api';

const AddTextForm = () => {
  const [text, setText] = useState('');
  const [userId, setUserId] = useState('');
  const [category, setCategory] = useState('');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResponse(null);
    setLoading(true);
    try {
      const res = await addTextMemory(text, userId, category);
      setResponse(res.data);
    } catch (err) {
      setError(err.response ? err.response.data : 'An error occurred');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-4">Add Text Memory</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Enter Text</label>
          <textarea
            className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
            rows="5"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your text here..."
            required
          ></textarea>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
            <input
              type="text"
              className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g., user-123"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <input
              type="text"
              className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., work, personal"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition duration-300 ease-in-out transform hover:scale-105"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Adding...
            </div>
          ) : (
            'Add Memory'
          )}
        </button>
      </form>
      {response && (
        <div className="mt-6 p-4 bg-green-100 border border-green-200 text-green-800 rounded-lg">
          <h3 className="font-bold text-lg">Success!</h3>
          <pre className="whitespace-pre-wrap text-sm mt-2 bg-gray-50 p-3 rounded">{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-200 text-red-800 rounded-lg">
          <h3 className="font-bold text-lg">Error!</h3>
          <pre className="whitespace-pre-wrap text-sm mt-2 bg-gray-50 p-3 rounded">{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default AddTextForm;