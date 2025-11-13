/**
 * Thread Service - FastAPI Backend Integration
 * Manages Content Strategist conversation threads via FastAPI
 */

import apiClient from '../apiClient';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ContentThread {
  id: string;
  workspace_id: string;
  title: string;
  messages: ChatMessage[];
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ThreadListResponse {
  items: ContentThread[];
  total: number;
  limit: number;
  offset: number;
}

export class ThreadService {
  /**
   * Create a new conversation thread
   */
  static async createThread(
    title: string = "New Chat"
  ): Promise<ContentThread> {
    const response = await apiClient.post('/threads', {
      title
    });
    return response.data;
  }

  /**
   * Get all threads for workspace with pagination
   */
  static async getAllThreads(
    limit: number = 50,
    offset: number = 0
  ): Promise<ThreadListResponse> {
    const response = await apiClient.get('/threads', {
      params: { limit, offset }
    });
    return response.data;
  }

  /**
   * Get thread by ID
   */
  static async getThreadById(
    threadId: string
  ): Promise<ContentThread> {
    const response = await apiClient.get(`/threads/${threadId}`);
    return response.data;
  }

  /**
   * Update thread title
   */
  static async updateThreadTitle(
    threadId: string,
    title: string
  ): Promise<ContentThread> {
    const response = await apiClient.put(`/threads/${threadId}/title`, {
      title
    });
    return response.data;
  }

  /**
   * Add a message to thread
   */
  static async addMessage(
    threadId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<ContentThread> {
    const response = await apiClient.post(`/threads/${threadId}/messages`, {
      role,
      content
    });
    return response.data;
  }

  /**
   * Update all messages in thread
   */
  static async updateMessages(
    threadId: string,
    messages: ChatMessage[]
  ): Promise<ContentThread> {
    const response = await apiClient.put(`/threads/${threadId}/messages`, {
      messages
    });
    return response.data;
  }

  /**
   * Delete thread (soft delete)
   */
  static async deleteThread(threadId: string): Promise<void> {
    await apiClient.delete(`/threads/${threadId}`);
  }

  /**
   * Restore deleted thread
   */
  static async restoreThread(threadId: string): Promise<ContentThread> {
    const response = await apiClient.post(`/threads/${threadId}/restore`);
    return response.data;
  }

  /**
   * Get recent threads
   */
  static async getRecentThreads(limit: number = 10): Promise<ContentThread[]> {
    const response = await apiClient.get('/threads/recent', {
      params: { limit }
    });
    return response.data;
  }
}
