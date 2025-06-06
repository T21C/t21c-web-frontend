import api from './api';

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

export const uploadFileInChunks = async (file, uploadUrl, onProgress) => {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const fileId = Math.random().toString(36).substring(7);
  
  console.log('Starting chunked upload:', {
    fileSize: file.size,
    totalChunks,
    fileId
  });
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    const formData = new FormData();
    formData.append('chunk', chunk);
    
    // Log form data contents
    console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks}:`, {
      chunkSize: chunk.size,
      formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
        key,
        value: value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value
      }))
    });
    
    try {
      const response = await api.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-File-Id': fileId,
          'X-Chunk-Index': chunkIndex,
          'X-Total-Chunks': totalChunks
        },
        onUploadProgress: (progressEvent) => {
          const chunkProgress = (progressEvent.loaded / progressEvent.total) * 100;
          const totalProgress = ((chunkIndex + chunkProgress / 100) / totalChunks) * 100;
          onProgress?.(totalProgress);
        },
      });
      
      console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully:`, response.data);
    } catch (error) {
      console.error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks}:`, {
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks}: ${error.message}`);
    }
  }
  
  return fileId;
};

export const validateChunkedUpload = async (fileId, uploadUrl) => {
  try {
    const response = await api.post(uploadUrl, { fileId });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to validate upload: ${error.message}`);
  }
}; 