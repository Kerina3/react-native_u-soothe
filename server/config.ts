/**
 * API 配置
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  predictUrination: `${API_BASE_URL}/api/predict-urination`,
  health: `${API_BASE_URL}/health`,
};
