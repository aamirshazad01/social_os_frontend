import apiClient from '../apiClient';
import { Post, PaginatedResponse, ApiResponse } from '../types';
import { handleApiError } from '../errorHandler';

export interface CreatePostRequest {
  workspace_id: string;
  topic: string;
  platforms: string[];
  content: Record<string, any>;
  status?: string;
  scheduled_at?: string;
  campaign_id?: string;
}

export const postsService = {
  async getPosts(workspaceId: string, params?: {
    page?: number;
    page_size?: number;
    status?: string;
  }): Promise<PaginatedResponse<Post>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Post>>('/posts', {
        params: { workspace_id: workspaceId, ...params },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getPost(postId: string): Promise<Post> {
    try {
      const response = await apiClient.get<Post>(`/posts/${postId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async createPost(data: CreatePostRequest): Promise<Post> {
    try {
      const response = await apiClient.post<Post>('/posts', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async updatePost(postId: string, data: Partial<CreatePostRequest>): Promise<Post> {
    try {
      const response = await apiClient.put<Post>(`/posts/${postId}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async deletePost(postId: string): Promise<void> {
    try {
      await apiClient.delete(`/posts/${postId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async publishPost(postId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(`/posts/${postId}/publish`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getScheduledPosts(workspaceId: string): Promise<Post[]> {
    try {
      const response = await apiClient.get<Post[]>('/posts/scheduled', {
        params: { workspace_id: workspaceId },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async updatePostStatus(postId: string, status: string): Promise<Post> {
    try {
      const response = await apiClient.patch<Post>(`/posts/${postId}/status`, { status });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
