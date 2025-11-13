import apiClient from '../apiClient';
import { ApiResponse } from '../types';
import { handleApiError } from '../errorHandler';

export interface UploadMediaRequest {
  workspace_id: string;
  file: File;
  type?: string;
}

export interface Base64UploadRequest {
  base64Data: string;
  fileName: string;
  type: 'image' | 'video';
  workspace_id: string;
}

export const mediaService = {
  async uploadImage(file: File, workspaceId: string): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<ApiResponse>('/media/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { workspace_id: workspaceId }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async uploadVideo(file: File, workspaceId: string): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<ApiResponse>('/media/upload/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { workspace_id: workspaceId }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async uploadBase64(data: Base64UploadRequest): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/media/upload/base64', {
        base64Data: data.base64Data,
        fileName: data.fileName,
        type: data.type
      }, {
        params: { workspace_id: data.workspace_id }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async uploadMedia(data: UploadMediaRequest): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('workspace_id', data.workspace_id);
      if (data.type) {
        formData.append('type', data.type);
      }

      const response = await apiClient.post<ApiResponse>('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getMedia(mediaId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.get<ApiResponse>(`/media/${mediaId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async deleteMedia(mediaId: string): Promise<void> {
    try {
      await apiClient.delete(`/media/${mediaId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getWorkspaceMedia(workspaceId: string, params?: {
    page?: number;
    page_size?: number;
    type?: string;
  }): Promise<ApiResponse> {
    try {
      const response = await apiClient.get<ApiResponse>('/media', {
        params: { workspace_id: workspaceId, ...params },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
