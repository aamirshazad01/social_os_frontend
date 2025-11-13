import apiClient from '../apiClient';
import { ApiResponse, Credential } from '../types';
import { handleApiError } from '../errorHandler';

export interface OAuthAuthorizationResponse {
  authorization_url: string;
  redirectUrl?: string;
  state?: string;
}

export interface CredentialStatus {
  platform: string;
  connected: boolean;
  username?: string;
  expires_at?: string;
}

export interface PlatformPostRequest {
  content: string;
  media_urls?: string[];
  workspace_id: string;
}

export const platformService = {
  async getAuthorizationUrl(platform: string, workspaceId?: string): Promise<OAuthAuthorizationResponse> {
    try {
      const params = workspaceId ? { workspace_id: workspaceId } : {};
      const response = await apiClient.get<ApiResponse<OAuthAuthorizationResponse>>(
        `/oauth/${platform}/authorize`,
        { params }
      );
      const data = response.data.data!;
      // Add redirectUrl for compatibility
      return {
        ...data,
        redirectUrl: data.authorization_url || data.redirectUrl
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getCredentialStatus(workspaceId?: string): Promise<CredentialStatus[]> {
    try {
      const params = workspaceId ? { workspace_id: workspaceId } : {};
      const response = await apiClient.get<CredentialStatus[]>('/credentials/status', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async disconnectPlatform(platform: string, workspaceId?: string): Promise<void> {
    try {
      const params = workspaceId ? { workspace_id: workspaceId } : {};
      await apiClient.delete(`/credentials/${platform}/disconnect`, { params });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async disconnect(platform: string, workspaceId?: string): Promise<void> {
    return this.disconnectPlatform(platform, workspaceId);
  },

  async verifyConnection(platform: string, workspaceId: string): Promise<{ connected: boolean; username?: string }> {
    try {
      const response = await apiClient.get(`/platforms/${platform}/verify`, {
        params: { workspace_id: workspaceId },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async postToPlatform(platform: string, data: PlatformPostRequest): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(`/platforms/${platform}/post`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async uploadMedia(platform: string, file: File, workspaceId: string): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('workspace_id', workspaceId);

      const response = await apiClient.post<ApiResponse>(`/platforms/${platform}/upload-media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async publishToMultiplePlatforms(data: {
    platforms: string[];
    content_by_platform: Record<string, string>;
    media_urls?: string[];
    workspace_id: string;
  }): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/platforms/publish/multiple', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async publishSingle(data: {
    platform: string;
    content: string;
    media_urls?: string[];
    workspace_id: string;
  }): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/platforms/publish', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
