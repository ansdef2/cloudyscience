import { Course } from "@/models/Api";
import { AUTH_TOKEN_KEY } from "@/utils/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        return { error: errorData.error || `HTTP error! status: ${response.status}` };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const apiClient = new ApiClient(API_BASE_URL);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    return apiClient.post('/auth/login', { email, password });
  },
  
  register: async (email: string, password: string, name: string) => {
    return apiClient.post('/auth/register', { email, password, name });
  },
  
  getProfile: async () => {
    return apiClient.get('/auth/profile');
  },
};

// Institutions API
export const institutionsApi = {
  getAll: async (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiClient.get(`/institutions${query}`);
  },
  
  getById: async (id: string) => {
    return apiClient.get(`/institutions/${id}`);
  },
};

// Courses API
export const coursesApi = {
  getAll: async (search?: string, institutionId?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (institutionId) params.append('institutionId', institutionId);
    const query = params.toString() ? `?${params}` : '';
    return apiClient.get<Course[]>(`/courses${query}`);
  },
  
  getById: async (id: string) => {
    return apiClient.get<Course>(`/courses/${id}`);
  },
};

// Equipment API
export const equipmentApi = {
  getAll: async (search?: string, institutionId?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (institutionId) params.append('institutionId', institutionId);
    const query = params.toString() ? `?${params}` : '';
    return apiClient.get(`/equipment${query}`);
  },
  
  getById: async (id: string) => {
    return apiClient.get(`/equipment/${id}`);
  },
};

// Bookings API
export const bookingsApi = {
  getAll: async () => {
    return apiClient.get('/bookings');
  },
  
  getById: async (id: string) => {
    return apiClient.get(`/bookings/${id}`);
  },
  
  create: async (data: any) => {
    return apiClient.post('/bookings', data);
  },
  
  update: async (id: string, data: any) => {
    return apiClient.put(`/bookings/${id}`, data);
  },
  
  delete: async (id: string) => {
    return apiClient.delete(`/bookings/${id}`);
  },
};

export default apiClient;
