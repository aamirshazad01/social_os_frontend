import apiClient from '../apiClient';
import { LibraryItem, PaginatedResponse } from '../types';
import { handleApiError } from '../errorHandler';

export interface CreateLibraryItemRequest {
  workspace_id: string;
  title: string;
  content: any;
  type: string;
  tags?: string[];
}

export const libraryService = {
  async getLibraryItems(workspaceId: string, params?: {
    page?: number;
    page_size?: number;
    type?: string;
  }): Promise<PaginatedResponse<LibraryItem>> {
    try {
      const response = await apiClient.get<PaginatedResponse<LibraryItem>>('/library', {
        params: { workspace_id: workspaceId, ...params },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getLibraryItem(itemId: string): Promise<LibraryItem> {
    try {
      const response = await apiClient.get<LibraryItem>(`/library/${itemId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async createLibraryItem(data: CreateLibraryItemRequest): Promise<LibraryItem> {
    try {
      const response = await apiClient.post<LibraryItem>('/library', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async updateLibraryItem(itemId: string, data: Partial<CreateLibraryItemRequest>): Promise<LibraryItem> {
    try {
      const response = await apiClient.put<LibraryItem>(`/library/${itemId}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async deleteLibraryItem(itemId: string): Promise<void> {
    try {
      await apiClient.delete(`/library/${itemId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
