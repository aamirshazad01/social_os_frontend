import apiClient from '../apiClient';
import { ApiResponse } from '../types';
import { handleApiError } from '../errorHandler';

export interface AnalyticsData {
  platform: string;
  metrics: {
    impressions?: number;
    engagements?: number;
    clicks?: number;
    shares?: number;
    comments?: number;
    likes?: number;
  };
  period: string;
}

export const analyticsService = {
  async getWorkspaceAnalytics(workspaceId: string, params?: {
    start_date?: string;
    end_date?: string;
    platforms?: string[];
  }): Promise<AnalyticsData[]> {
    try {
      const response = await apiClient.get<AnalyticsData[]>('/analytics', {
        params: { workspace_id: workspaceId, ...params },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getPostAnalytics(postId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.get<ApiResponse>(`/analytics/posts/${postId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getCampaignAnalytics(campaignId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.get<ApiResponse>(`/analytics/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getPlatformAnalytics(platform: string, workspaceId: string, params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse> {
    try {
      const response = await apiClient.get<ApiResponse>(`/analytics/platforms/${platform}`, {
        params: { workspace_id: workspaceId, ...params },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
