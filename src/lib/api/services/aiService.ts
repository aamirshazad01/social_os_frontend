import apiClient from '../apiClient';
import { ApiResponse } from '../types';
import { handleApiError } from '../errorHandler';

export interface GenerateContentRequest {
  topic: string;
  platforms: string[];
  content_type: string;
  tone: string;
  additional_context?: string;
}

export interface EngagementAnalysisRequest {
  content: string;
  platform: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  size?: string;
  style?: string;
}

export interface CampaignBriefRequest {
  goals: string;
  target_audience: string;
  platforms: string[];
  duration: number;
}

export const aiService = {
  async generateContent(request: GenerateContentRequest): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/ai/content/generate', request);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async analyzeEngagement(data: EngagementAnalysisRequest): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/ai/content/engagement', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async repurposeContent(
    longFormContent: string,
    platforms: string[],
    numberOfPosts: number = 5
  ): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/ai/content/repurpose', {
        long_form_content: longFormContent,
        platforms,
        number_of_posts: numberOfPosts,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async generateImage(data: ImageGenerationRequest): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/ai/media/image/generate', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async editImage(data: { prompt: string; imageUrl: string; input_fidelity?: string; options?: any }): Promise<any> {
    try {
      const response = await apiClient.post<ApiResponse>('/ai/media/image/edit', data);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async generateVideo(data: { prompt: string; duration?: number }): Promise<any> {
    try {
      const response = await apiClient.post<ApiResponse>('/ai/media/video', data);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getVideoStatus(videoId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.get<ApiResponse>(`/ai/media/video/${videoId}/status`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async strategistChat(message: string, history: any[] = []): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/ai/content/strategist/chat', {
        message,
        history,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async generateCampaignBrief(data: CampaignBriefRequest): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/ai/campaigns/brief', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async generateCampaignIdeas(topic: string, platforms: string[]): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/ai/campaigns/ideas', {
        topic,
        platforms,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async generateCampaignContent(campaignId: string, numberOfPosts: number): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/ai/campaigns/content/generate', {
        campaign_id: campaignId,
        number_of_posts: numberOfPosts,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async improvePrompt(data: { prompt: string; type: string; userGuidance?: string }): Promise<any> {
    try {
      const response = await apiClient.post<ApiResponse>('/ai/prompts/improve', data);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async streamImageGeneration(data: { prompt: string; options?: any; partial_images?: number }): Promise<Response> {
    try {
      const baseURL = apiClient.defaults.baseURL || '';
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${baseURL}/ai/media/image/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate image (${response.status})`);
      }

      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

export default aiService;
