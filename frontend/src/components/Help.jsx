import React from 'react';

const Help = () => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-4">Help & Documentation</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Frequently Asked Questions</h3>
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="font-semibold">How do I add a new memory?</h4>
              <p className="text-gray-600">Navigate to the "Add Text" or "Upload File" tab, fill in the required fields, and click the submit button.</p>
            </div>
            <div>
              <h4 className="font-semibold">How do I query my memories?</h4>
              <p className="text-gray-600">Go to the "Query Memory" tab, enter your question, and click "Query" to get a response.</p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Documentation</h3>
          <p className="text-gray-600">For more detailed information, please refer to our <a href="#" className="text-blue-600 hover:underline">official documentation</a>.</p>
        </div>
      </div>
    </div>
  );
};

export default Help;