import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '@/utils/api';
import toast from 'react-hot-toast';

const FolderContext = createContext();

export const useFolders = () => {
  const context = useContext(FolderContext);
  if (!context) {
    throw new Error('useFolders must be used within a FolderProvider');
  }
  return context;
};

export const FolderProvider = ({ children }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  // Fetch folders for a user
  const fetchFolders = useCallback(async (parentFolderId = null) => {
    try {
      setLoading(true);
      const params = parentFolderId !== null ? { parentFolderId } : {};
      const response = await api.get('/v2/database/levels/packs/folders', { params });
      setFolders(response.data.folders || []);
      
      // Restore expanded state for folders that were previously expanded
      const newExpandedFolders = new Set();
      response.data.folders?.forEach(folder => {
        if (folder.isExpanded) {
          newExpandedFolders.add(folder.id);
        }
      });
      setExpandedFolders(newExpandedFolders);
      
      return response.data.folders;
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to load folders');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new folder
  const createFolder = useCallback(async (name, parentFolderId = null) => {
    try {
      const response = await api.post('/v2/database/levels/packs/folders', {
        name,
        parentFolderId
      });
      
      const newFolder = response.data;
      setFolders(prev => [...prev, newFolder]);
      toast.success('Folder created successfully');
      
      return newFolder;
    } catch (error) {
      console.error('Error creating folder:', error);
      const message = error.response?.data?.error || 'Failed to create folder';
      toast.error(message);
      throw error;
    }
  }, []);

  // Rename a folder
  const renameFolder = useCallback(async (folderId, newName) => {
    try {
      const response = await api.put(`/v2/database/levels/packs/folders/${folderId}`, {
        name: newName
      });
      
      const updatedFolder = response.data;
      setFolders(prev => 
        prev.map(folder => 
          folder.id === folderId ? updatedFolder : folder
        )
      );
      
      toast.success('Folder renamed successfully');
      return updatedFolder;
    } catch (error) {
      console.error('Error renaming folder:', error);
      const message = error.response?.data?.error || 'Failed to rename folder';
      toast.error(message);
      throw error;
    }
  }, []);

  // Delete a folder
  const deleteFolder = useCallback(async (folderId) => {
    try {
      await api.delete(`/v2/database/levels/packs/folders/${folderId}`);
      
      setFolders(prev => prev.filter(folder => folder.id !== folderId));
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderId);
        return newSet;
      });
      
      toast.success('Folder deleted successfully');
    } catch (error) {
      console.error('Error deleting folder:', error);
      const message = error.response?.data?.error || 'Failed to delete folder';
      toast.error(message);
      throw error;
    }
  }, []);

  // Toggle folder expansion
  const toggleFolderExpansion = useCallback(async (folderId, isExpanded) => {
    try {
      // Update local state immediately for better UX
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        if (isExpanded) {
          newSet.add(folderId);
        } else {
          newSet.delete(folderId);
        }
        return newSet;
      });

      // Update on server
      await api.put(`/v2/database/levels/packs/folders/${folderId}`, {
        isExpanded
      });
      
      // Update local folders state
      setFolders(prev => 
        prev.map(folder => 
          folder.id === folderId ? { ...folder, isExpanded } : folder
        )
      );
    } catch (error) {
      console.error('Error toggling folder expansion:', error);
      // Revert local state on error
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        if (!isExpanded) {
          newSet.add(folderId);
        } else {
          newSet.delete(folderId);
        }
        return newSet;
      });
    }
  }, []);

  // Move pack to folder
  const movePackToFolder = useCallback(async (packId, folderId) => {
    try {
      await api.put(`/v2/database/levels/packs/${packId}`, {
        folderId
      });
      
      toast.success('Pack moved successfully');
    } catch (error) {
      console.error('Error moving pack:', error);
      const message = error.response?.data?.error || 'Failed to move pack';
      toast.error(message);
      throw error;
    }
  }, []);

  // Reorder folders and packs
  const reorderItems = useCallback(async (folders, packs) => {
    try {
      await api.put('/v2/database/levels/packs/folders/reorder', {
        folders,
        packs
      });
      
      toast.success('Items reordered successfully');
    } catch (error) {
      console.error('Error reordering items:', error);
      const message = error.response?.data?.error || 'Failed to reorder items';
      toast.error(message);
      throw error;
    }
  }, []);

  const value = {
    folders,
    loading,
    expandedFolders,
    fetchFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderExpansion,
    movePackToFolder,
    reorderItems,
    setFolders,
    setExpandedFolders
  };

  return (
    <FolderContext.Provider value={value}>
      {children}
    </FolderContext.Provider>
  );
};

export default FolderContext;
