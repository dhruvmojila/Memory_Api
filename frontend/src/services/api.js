import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (email, password) => {
  const formData = new FormData();
  formData.append("username", email);
  formData.append("password", password);
  return api.post(`/token`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const signup = (email, password, fullName) => {
  return api.post(`/users/`, {
    email,
    password,
    full_name: fullName,
  });
};

export const addTextMemory = (text, category) => {
  return api.post(`/memory/text`, {
    text,
    category,
  });
};

export const uploadFileMemory = (file, category) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  return api.post(`/memory/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const queryRAG = (question, category) => {
  return api.post(`/query/rag`, {
    question,
    category,
  });
};

export const getGraphData = (category) => {
  return api.get(`/query/visualize?category=${category}`);
};

export const graphUpdateWebSocket = () => {
  const ws = new WebSocket(
    `${window.location.origin.replace(/^http/, "ws")}/api/graph/updates`
  );

  ws.onmessage = (event) => {
    if (event.data === "ping") {
      ws.send("pong");
    }
  };

  return ws;
};
