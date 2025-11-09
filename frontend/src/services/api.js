import axios from "axios";

export const addTextMemory = (text, userId, category) => {
  return axios.post(`/api/memory/text`, {
    text,
    user_id: userId,
    category,
  });
};

export const uploadFileMemory = (file, userId, category) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);
  formData.append("category", category);
  return axios.post(`/api/memory/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const queryRAG = (question, userId, category) => {
  return axios.post(`/api/query/rag`, {
    question,
    user_id: userId,
    category,
  });
};
