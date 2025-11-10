import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/Tabs";
import AddTextForm from "../components/AddTextForm";
import UploadFileForm from "../components/UploadFileForm";
import QueryForm from "../components/QueryForm";
import Settings from "../components/Settings";
import Help from "../components/Help";
import Profile from "../components/Profile";
import GraphVisualizer from "../components/GraphVisualizer";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const Dashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 tracking-tight">
              Memory API Dashboard
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              A modern interface to manage your memory API.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Logout
          </button>
        </header>
        <div className="bg-white rounded-lg shadow-lg">
          <Tabs defaultValue="add-text">
            <TabsList>
              <TabsTrigger value="add-text">Add Text</TabsTrigger>
              <TabsTrigger value="upload-file">Upload File</TabsTrigger>
              <TabsTrigger value="query-memory">Query Memory</TabsTrigger>
              <TabsTrigger value="graph-visualizer">
                Graph Visualizer
              </TabsTrigger>
              <TabsTrigger value="settings">Settings (in dev)</TabsTrigger>
              <TabsTrigger value="help">Help (in dev)</TabsTrigger>
              <TabsTrigger value="profile">Profile (in dev)</TabsTrigger>
            </TabsList>
            <TabsContent value="add-text">
              <AddTextForm />
            </TabsContent>
            <TabsContent value="upload-file">
              <UploadFileForm />
            </TabsContent>
            <TabsContent value="query-memory">
              <QueryForm />
            </TabsContent>
            <TabsContent value="graph-visualizer">
              <GraphVisualizer />
            </TabsContent>
            <TabsContent value="settings">
              <Settings />
            </TabsContent>
            <TabsContent value="help">
              <Help />
            </TabsContent>
            <TabsContent value="profile">
              <Profile />
            </TabsContent>
          </Tabs>
        </div>
        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>
            &copy; {new Date().getFullYear()} Memory API. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
