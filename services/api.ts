// ===== DentalVis API Service =====
// 對應 dental-web/static/js/api.js

import * as SecureStore from 'expo-secure-store';

const API_BASE = 'http://140.115.51.163:40111';
const TOKEN_KEY = 'smileguardian_token';

// ===== Token 管理 =====
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ===== Auth =====
export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || '登入失敗');
  await setToken(data.token);
  return data;
}

export async function register(email: string, name: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || '註冊失敗');
  await setToken(data.token);
  return data;
}

export async function fetchMe() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/auth/me`, { headers });
  if (!res.ok) throw new Error('未登入');
  return res.json();
}

// ===== Model Status =====
export async function fetchModelStatus() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/model_status`, { headers });
  return res.json();
}

// ===== Analyses =====
export async function fetchAnalyses() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/analyses`, { headers });
  if (!res.ok) return [];
  return res.json();
}

// ===== Submit =====
export async function submitInit(files: Record<string, { uri: string; name: string; type: string }>, mirror = false) {
  const headers = await authHeaders();
  const formData = new FormData();
  for (const [view, file] of Object.entries(files)) {
    formData.append(view, { uri: file.uri, name: `${view}.jpg`, type: 'image/jpeg' } as any);
  }
  formData.append('mirror', mirror ? '1' : '0');
  const res = await fetch(`${API_BASE}/init`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return res.json();
}

export async function submitInitMulti(
  files: Record<string, Array<{ uri: string; name: string; type: string }>>,
  mirror = false
) {
  const headers = await authHeaders();
  const formData = new FormData();
  for (const [view, arr] of Object.entries(files)) {
    const fileArr = Array.isArray(arr) ? arr : [arr];
    fileArr.forEach((file, i) => {
      formData.append(`${view}_${i}`, { uri: file.uri, name: `${view}_${i}.jpg`, type: 'image/jpeg' } as any);
    });
  }
  formData.append('mirror', mirror ? '1' : '0');
  const res = await fetch(`${API_BASE}/init_multi`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return res.json();
}

export async function submitPlaque(files: Record<string, { uri: string; name: string; type: string }>, mirror = false) {
  const headers = await authHeaders();
  const formData = new FormData();
  for (const [view, file] of Object.entries(files)) {
    formData.append(view, { uri: file.uri, name: `${view}.jpg`, type: 'image/jpeg' } as any);
  }
  formData.append('mirror', mirror ? '1' : '0');
  const res = await fetch(`${API_BASE}/plaque`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return res.json();
}

// ===== Photo Quality Check =====
export async function checkPhotoQuality(uri: string, view: string): Promise<{
  ok: boolean; issues: string[]; tips: string[];
  stats: { brightness: number; sharpness: number; toothArea: string };
}> {
  const formData = new FormData();
  formData.append('file', { uri, name: 'check.jpg', type: 'image/jpeg' } as any);
  formData.append('view', view);
  const res = await fetch(`${API_BASE}/check_photo`, { method: 'POST', body: formData });
  return res.json();
}

// ===== Task Status =====
export async function fetchTaskStatus(taskId: string) {
  const res = await fetch(`${API_BASE}/status/${taskId}`);
  return res.json();
}

// ===== File URL =====
export async function getFileUrl(filename: string): Promise<string> {
  const token = await getToken();
  if (token) return `${API_BASE}/files/${filename}?token=${token}`;
  return `${API_BASE}/files/${filename}`;
}

export { API_BASE };
