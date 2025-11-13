import apiClient from '../apiClient';
import { Campaign, PaginatedResponse } from '../types';
import { handleApiError } from '../errorHandler';

export interface CreateCampaignRequest {
  workspace_id: string;
  name: string;
  description?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export const campaignService = {
  async getCampaigns(workspaceId: string, params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Campaign>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Campaign>>('/campaigns', {
        params: { workspace_id: workspaceId, ...params },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getCampaign(campaignId: string): Promise<Campaign> {
    try {
      const response = await apiClient.get<Campaign>(`/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async createCampaign(data: CreateCampaignRequest): Promise<Campaign> {
    try {
      const response = await apiClient.post<Campaign>('/campaigns', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async updateCampaign(campaignId: string, data: Partial<CreateCampaignRequest>): Promise<Campaign> {
    try {
      const response = await apiClient.put<Campaign>(`/campaigns/${campaignId}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      await apiClient.delete(`/campaigns/${campaignId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
