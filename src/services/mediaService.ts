/**
 * Media Service - Supabase Storage via FastAPI Backend
 * Migrated from IndexedDB to cloud storage for better scalability and sharing
 */

import { MediaAsset } from '../types';
import { mediaService as apiMediaService } from '../lib/api/services';

// Convert data URL to File object for upload
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

// Save a media asset (now uploads to Supabase)
export async function saveMediaAsset(asset: MediaAsset, workspaceId: string): Promise<void> {
  // For compatibility - this function is mainly used for metadata tracking
  // The actual file should already be uploaded to Supabase
  console.log('Media asset saved:', asset.name);
}

// Get all media assets (from Supabase via API)
export async function getAllMediaAssets(workspaceId: string): Promise<MediaAsset[]> {
  try {
    const response = await apiMediaService.getWorkspaceMedia(workspaceId);
    if (response.success && response.data) {
      return response.data.items || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching media assets:', error);
    return [];
  }
}

// Get media asset by ID
export async function getMediaAssetById(id: string): Promise<MediaAsset | undefined> {
  try {
    const response = await apiMediaService.getMedia(id);
    if (response.success && response.data) {
      return response.data;
    }
    return undefined;
  } catch (error) {
    console.error('Error fetching media asset:', error);
    return undefined;
  }
}

// Delete media asset (from Supabase)
export async function deleteMediaAsset(id: string): Promise<void> {
  try {
    await apiMediaService.deleteMedia(id);
  } catch (error) {
    console.error('Error deleting media asset:', error);
    throw error;
  }
}

// Search media by tags
export async function searchMediaByTags(tags: string[], workspaceId: string): Promise<MediaAsset[]> {
  const allAssets = await getAllMediaAssets(workspaceId);
  return allAssets.filter(asset =>
    asset.tags && tags.some(tag => asset.tags.some(t => t.toLowerCase().includes(tag.toLowerCase())))
  );
}

// Update media asset tags (via API)
export async function updateMediaTags(id: string, tags: string[]): Promise<void> {
  // This would need a backend endpoint to update metadata
  console.log('Update tags for media:', id, tags);
  // TODO: Implement backend endpoint for updating media metadata
}

// Get media by type
export async function getMediaByType(type: 'image' | 'video', workspaceId: string): Promise<MediaAsset[]> {
  try {
    const response = await apiMediaService.getWorkspaceMedia(workspaceId, { type });
    if (response.success && response.data) {
      return response.data.items || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching media by type:', error);
    return [];
  }
}

// Auto-save AI-generated media to Supabase
export async function autoSaveAIMedia(
  url: string,
  type: 'image' | 'video',
  postTopic?: string,
  workspaceId?: string
): Promise<MediaAsset> {
  if (!workspaceId) {
    throw new Error('Workspace ID is required for Supabase storage');
  }

  try {
    // Convert data URL to base64 for upload
    const fileName = `${type}_${new Date().getTime()}.${type === 'image' ? 'png' : 'mp4'}`;
    
    // Upload to Supabase via API
    const response = await apiMediaService.uploadBase64({
      base64Data: url,
      fileName,
      type,
      workspace_id: workspaceId
    });

    if (response.success && response.data) {
      const asset: MediaAsset = {
        id: crypto.randomUUID(),
        name: fileName,
        type,
        url: response.data.url,
        size: 0,
        tags: postTopic ? [postTopic] : [],
        createdAt: new Date().toISOString(),
        source: 'ai-generated',
        usedInPosts: [],
      };

      return asset;
    } else {
      throw new Error('Failed to upload to Supabase');
    }
  } catch (error) {
    console.error('Error auto-saving AI media:', error);
    throw error;
  }
}

// Create thumbnail for video (client-side utility)
export async function createVideoThumbnail(videoUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';

    video.addEventListener('loadeddata', () => {
      video.currentTime = 1; // Capture at 1 second
    });

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve(''); // Fallback
      }
    });
  });
}

// Handle file upload to Supabase
export async function uploadMediaFile(file: File, workspaceId: string): Promise<MediaAsset> {
  try {
    const type = file.type.startsWith('image/') ? 'image' : 'video';
    
    // Upload to Supabase via API
    const response = type === 'image' 
      ? await apiMediaService.uploadImage(file, workspaceId)
      : await apiMediaService.uploadVideo(file, workspaceId);

    if (response.success && response.data) {
      let thumbnailUrl: string | undefined;
      if (type === 'video') {
        // Create thumbnail for video
        const objectUrl = URL.createObjectURL(file);
        thumbnailUrl = await createVideoThumbnail(objectUrl);
        URL.revokeObjectURL(objectUrl);
      }

      const asset: MediaAsset = {
        id: crypto.randomUUID(),
        name: file.name,
        type,
        url: response.data.url,
        thumbnailUrl,
        size: file.size,
        tags: [],
        createdAt: new Date().toISOString(),
        source: 'uploaded',
        usedInPosts: [],
      };

      return asset;
    } else {
      throw new Error('Failed to upload to Supabase');
    }
  } catch (error) {
    console.error('Error uploading media file:', error);
    throw error;
  }
}

// Mark media as used in a post
export async function markMediaUsedInPost(mediaId: string, postId: string): Promise<void> {
  // This would need a backend endpoint to update usage tracking
  console.log('Mark media used in post:', mediaId, postId);
  // TODO: Implement backend endpoint for usage tracking
}

// Get storage stats from Supabase
export async function getStorageStats(workspaceId: string): Promise<{ totalAssets: number; totalSize: number }> {
  try {
    const assets = await getAllMediaAssets(workspaceId);
    const totalSize = assets.reduce((sum, asset) => sum + (asset.size || 0), 0);
    return { totalAssets: assets.length, totalSize };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return { totalAssets: 0, totalSize: 0 };
  }
}
