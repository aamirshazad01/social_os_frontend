import apiClient from '../apiClient';
import { handleApiError } from '../errorHandler';

export const authService = {
  async forgotPassword(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', { token, password });
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
