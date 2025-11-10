import React, { useState } from "react";
import { queryRAG } from "../services/api";

const QueryForm = () => {
  const [question, setQuestion] = useState("");
  const [userId, setUserId] = useState("");
  const [category, setCategory] = useState("");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResponse(null);
    setLoading(true);
    try {
      const res = await queryRAG(question, userId, category);
      setResponse(res.data);
    } catch (err) {
      setError(err.response ? err.response.data : "An error occurred");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-4">
        Query Memory
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
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
              <svg
                className="animate-spin h-5 w-5 mr-3 text-white"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Querying...
            </div>
          ) : (
            "Query"
          )}
        </button>
      </form>
      {response && (
        <div className="mt-6 p-4 bg-green-100 border border-green-200 text-green-800 rounded-lg">
          <h3 className="font-bold text-lg">Answer:</h3>
          <p className="mt-2">{response.answer}</p>
          <h4 className="font-bold text-lg mt-4">Retrieved Facts:</h4>
          <pre className="whitespace-pre-wrap text-sm mt-2 bg-gray-50 p-3 rounded">
            {JSON.stringify(response.retrieved_facts, null, 2)}
          </pre>
        </div>
      )}
      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-200 text-red-800 rounded-lg">
          <h3 className="font-bold text-lg">Error!</h3>
          <pre className="whitespace-pre-wrap text-sm mt-2 bg-gray-50 p-3 rounded">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default QueryForm;
