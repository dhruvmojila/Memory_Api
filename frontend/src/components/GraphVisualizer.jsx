import React, { useState, useEffect, useCallback } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { getGraphData, graphUpdateWebSocket } from "../services/api";

const GraphVisualizer = () => {
  const [userId, setUserId] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchGraphData = useCallback(async () => {
    if (!userId || !category) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getGraphData(userId, category);
      const data = response.data;
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, category]);

  useEffect(() => {
    if (userId && category) {
      fetchGraphData();
    }
  }, [userId, category, fetchGraphData]);

  useEffect(() => {
    const ws = graphUpdateWebSocket();
    ws.onmessage = (event) => {
      if (event.data === "graph_updated") {
        console.log("Graph update received — refreshing data");
        fetchGraphData();
      }
    };
    ws.onerror = (err) => console.error("WebSocket error:", err);
    return () => ws.close();
  }, [fetchGraphData]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-4">
        Graph Visualizer
      </h2>

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
        onClick={fetchGraphData}
        disabled={loading || !userId || !category}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition duration-300 ease-in-out transform hover:scale-105 mb-6"
      >
        {loading ? "Loading Graph..." : "Load Graph"}
      </button>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-200 text-red-800 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div
        className="border border-gray-300 rounded-lg overflow-hidden"
        style={{ width: "100%", height: "600px" }}
      >
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            {loading
              ? "Loading..."
              : "Enter User ID and Category, then click 'Load Graph'."}
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphVisualizer;
