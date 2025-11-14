import apiClient from '../apiClient';
import { Workspace, ApiResponse } from '../types';
import { handleApiError } from '../errorHandler';
import type { WorkspaceMember, WorkspaceInvite } from '../../../types/workspace';

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}

export const workspaceService = {
  async getWorkspaces(): Promise<Workspace[]> {
    try {
      const response = await apiClient.get<Workspace[]>('/workspaces');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    try {
      const response = await apiClient.get<Workspace>(`/workspaces/${workspaceId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    try {
      const response = await apiClient.post<Workspace>('/workspaces', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async updateWorkspace(workspaceId: string, data: Partial<CreateWorkspaceRequest>): Promise<Workspace> {
    try {
      const response = await apiClient.put<Workspace>(`/workspaces/${workspaceId}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      await apiClient.delete(`/workspaces/${workspaceId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    try {
      const response = await apiClient.get<WorkspaceMember[]>('/members');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async removeMember(userId: string, workspaceId: string): Promise<void> {
    try {
      await apiClient.delete(`/members/${userId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async updateMemberRole(userId: string, role: string, workspaceId: string): Promise<WorkspaceMember> {
    try {
      const response = await apiClient.put<WorkspaceMember>(`/members/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async inviteMember(workspaceId: string, inviteData: { email?: string; role: string; expiresInDays?: number }): Promise<any> {
    try {
      const payload: { email?: string; role: string; expires_in_days?: number } = {
        role: inviteData.role,
      };

      if (inviteData.email) {
        payload.email = inviteData.email;
      }

      if (typeof inviteData.expiresInDays === 'number') {
        payload.expires_in_days = inviteData.expiresInDays;
      }

      const response = await apiClient.post<any>('/invites', payload);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
    try {
      const response = await apiClient.get<WorkspaceInvite[]>('/invites');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async deleteInvite(inviteId: string, workspaceId: string): Promise<void> {
    try {
      await apiClient.delete(`/invites/${inviteId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async validateInvite(token: string): Promise<any> {
    try {
      const response = await apiClient.get<any>(`/invites/${token}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async acceptInvite(token: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/invites/accept', { token });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getActivity(workspaceId: string, limit?: number): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>('/activity', {
        params: { workspace_id: workspaceId, limit },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
