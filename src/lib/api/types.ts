export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ErrorResponse {
  detail: string;
  error: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  max_users?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  workspace_id: string;
  created_by: string;
  topic: string;
  platforms: string[];
  content: Record<string, any>;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduled_at?: string;
  published_at?: string;
  campaign_id?: string;
  engagement_score?: any;
  engagement_suggestions?: string[];
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface LibraryItem {
  id: string;
  workspace_id: string;
  title: string;
  content: any;
  type: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Credential {
  id: string;
  workspace_id: string;
  platform: string;
  username?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// Image Generation Types
export interface ImageGenerationOptions {
  size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  quality?: 'low' | 'medium' | 'high' | 'auto';
  format?: 'png' | 'jpeg' | 'webp';
  background?: 'transparent' | 'opaque' | 'auto';
  output_compression?: number;
  moderation?: 'auto' | 'low';
}

export interface ImageGenerationResult {
  imageUrl: string;
  metadata: ImageGenerationMetadata;
  generatedAt: number;
  generationTime?: number;
}

export interface ImageGenerationMetadata extends ImageGenerationOptions {
  model: string;
  promptUsed: string;
  revisedPrompt?: string;
  tokensUsed?: number;
  costEstimate?: number;
}

export interface StreamingProgressEvent {
  type: 'partial' | 'final' | 'error';
  partial_image_index?: number;
  imageB64?: string;
  b64_json?: string;
  progress?: number;
  error?: string;
}

export interface ImageGenerationPreset {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  options: ImageGenerationOptions;
  promptEnhancement?: string;
  category: 'platform' | 'quality' | 'style' | 'custom';
}

// Built-in presets
export const imageGenerationPresets: Record<string, ImageGenerationPreset> = {
  instagram: {
    id: 'instagram',
    name: 'Instagram Post',
    description: 'Square format, vibrant colors',
    icon: '📸',
    options: {
      size: '1024x1024',
      quality: 'medium',
      format: 'png',
      background: 'auto',
    },
    category: 'platform',
  },
  twitter: {
    id: 'twitter',
    name: 'Twitter/X',
    description: 'Landscape, optimized for feed',
    icon: '🐦',
    options: {
      size: '1536x1024',
      quality: 'medium',
      format: 'jpeg',
      background: 'auto',
    },
    category: 'platform',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    description: 'Landscape format for Facebook posts',
    icon: '📘',
    options: {
      size: '1536x1024',
      quality: 'medium',
      format: 'jpeg',
      background: 'auto',
    },
    category: 'platform',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Professional, corporate style',
    icon: '💼',
    options: {
      size: '1024x1024',
      quality: 'high',
      format: 'png',
      background: 'auto',
    },
    category: 'platform',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Vertical format for TikTok',
    icon: '🎵',
    options: {
      size: '1024x1536',
      quality: 'high',
      format: 'png',
      background: 'auto',
    },
    category: 'platform',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube Thumbnail',
    description: 'Landscape format for YouTube thumbnails',
    icon: '📺',
    options: {
      size: '1536x1024',
      quality: 'high',
      format: 'jpeg',
      background: 'auto',
    },
    category: 'platform',
  },
};

/**
 * Get image generation preset for a specific platform
 */
export function getPresetForPlatform(platform: string): ImageGenerationOptions {
  const platformLower = platform.toLowerCase();
  
  const presetMap: Record<string, string> = {
    'instagram': 'instagram',
    'twitter': 'twitter',
    'facebook': 'facebook',
    'linkedin': 'linkedin',
    'tiktok': 'tiktok',
    'youtube': 'youtube',
  };
  
  const presetId = presetMap[platformLower];
  if (presetId && imageGenerationPresets[presetId]) {
    return imageGenerationPresets[presetId].options;
  }
  
  // Default fallback
  return {
    size: '1024x1024',
    quality: 'medium',
    format: 'png',
    background: 'auto',
  };
}
