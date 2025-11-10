import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
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

  const fetchGraphDataRef = useRef(null);

  // Memoize node and edge types to fix the warning
  const nodeTypes = useMemo(() => ({}), []);
  const edgeTypes = useMemo(() => ({}), []);

  // Enhance nodes and edges with modern styling
  const styledNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      style: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
        border: "2px solid #fff",
        borderRadius: "12px",
        padding: "12px 20px",
        fontSize: "14px",
        fontWeight: "600",
        boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
        minWidth: "150px",
        textAlign: "center",
      },
    }));
  }, [nodes]);

  const styledEdges = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      type: "smoothstep",
      animated: true,
      style: {
        stroke: "#667eea",
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#667eea",
        width: 20,
        height: 20,
      },
      labelStyle: {
        fontSize: "11px",
        fontWeight: "600",
        fill: "#4a5568",
        background: "#fff",
        padding: "4px 8px",
        borderRadius: "6px",
      },
      labelBgStyle: {
        fill: "#fff",
        fillOpacity: 0.9,
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 6,
    }));
  }, [edges]);

  const fetchGraphData = useCallback(async () => {
    if (!userId) return;
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
  }, [userId, category, setNodes, setEdges]);

  useEffect(() => {
    fetchGraphDataRef.current = fetchGraphData;
  }, [fetchGraphData]);

  useEffect(() => {
    if (userId) {
      fetchGraphData();
    }
  }, [userId, category, fetchGraphData]);

  useEffect(() => {
    const ws = graphUpdateWebSocket();

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      if (event.data === "ping") {
        ws.send("pong");
      } else if (event.data === "graph_updated") {
        console.log("Graph update received — refreshing data");
        if (fetchGraphDataRef.current) {
          fetchGraphDataRef.current();
        }
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  return (
    <div className="bg-white">
      <h2 className="text-3xl font-bold mb-6 text-blue-600 border-b-2 border-blue-200 pb-4">
        Graph Visualizer
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            User ID
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 text-gray-700 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 shadow-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g., user-123"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Category (Optional)
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 text-gray-700 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 shadow-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., work, personal"
          />
        </div>
      </div>

      <button
        onClick={fetchGraphData}
        disabled={loading || !userId || !category}
        className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl  hover:bg-blue-700 disabled:bg-blue-400 transition duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-lg mb-6 shadow-md"
      >
        {loading ? "Loading Graph..." : "Load Graph"}
      </button>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-lg shadow-sm">
          <strong className="font-semibold">Error:</strong> {error}
        </div>
      )}

      <div
        className="border-2 border-blue-200 rounded-xl overflow-hidden shadow-lg bg-white"
        style={{ width: "100%", height: "600px" }}
      >
        {styledNodes.length > 0 ? (
          <ReactFlow
            nodes={styledNodes}
            edges={styledEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <MiniMap
              nodeColor={(node) => "#667eea"}
              maskColor="rgba(102, 126, 234, 0.1)"
              style={{
                backgroundColor: "#f8fafc",
                border: "2px solid #e2e8f0",
                borderRadius: "8px",
              }}
            />
            <Controls
              style={{
                border: "2px solid #e2e8f0",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            />
            <Background variant="dots" gap={16} size={1} color="#cbd5e1" />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 bg-linear-to-br from-purple-50 to-blue-50">
            <div className="text-center">
              <svg
                className="mx-auto h-16 w-16 text-purple-300 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="font-medium text-gray-600">
                {loading
                  ? "Loading..."
                  : "Enter User ID and Category, then click 'Load Graph'."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphVisualizer;
