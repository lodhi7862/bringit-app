import { getApiUrl, apiRequest } from "@/lib/query-client";

export interface ServerUser {
  id: string;
  name: string;
  role: string;
  avatarSvg: string | null;
  createdAt: string;
}

export interface ServerConnectionRequest {
  id: number;
  fromUserId: string;
  fromUserName: string;
  fromUserRole: string;
  fromUserAvatar: string | null;
  toUserId: string;
  toUserName?: string;
  toUserRole?: string;
  toUserAvatar?: string | null;
  status: string;
  createdAt: string;
}

export interface ServerFamilyMember {
  id: string;
  userId: string;
  name: string;
  role: string;
  avatarSvg: string | null;
  connectedAt: string;
}

export async function registerAppUser(user: {
  id: string;
  name: string;
  role: string;
  avatarSvg: string | null;
}): Promise<void> {
  const url = new URL("/api/app-users", getApiUrl());
  await apiRequest("POST", url.toString(), user);
}

export async function getUserById(id: string): Promise<ServerUser | null> {
  try {
    const url = new URL(`/api/app-users/${id}`, getApiUrl());
    const response = await fetch(url.toString());
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error("Failed to fetch user");
    }
    return await response.json();
  } catch {
    return null;
  }
}

export async function sendConnectionRequest(params: {
  fromUserId: string;
  fromUserName: string;
  fromUserRole: string;
  fromUserAvatar: string | null;
  toUserId: string;
}): Promise<{ success: boolean; error?: string; targetUser?: ServerUser }> {
  try {
    const url = new URL("/api/connection-requests", getApiUrl());
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error };
    }
    
    return { success: true, targetUser: data.targetUser };
  } catch (error) {
    return { success: false, error: "Network error. Please try again." };
  }
}

export async function getIncomingRequests(userId: string): Promise<ServerConnectionRequest[]> {
  try {
    const url = new URL(`/api/connection-requests/incoming/${userId}`, getApiUrl());
    const response = await fetch(url.toString());
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch {
    return [];
  }
}

export async function getOutgoingRequests(userId: string): Promise<ServerConnectionRequest[]> {
  try {
    const url = new URL(`/api/connection-requests/outgoing/${userId}`, getApiUrl());
    const response = await fetch(url.toString());
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch {
    return [];
  }
}

export async function acceptConnectionRequest(requestId: number, userId: string): Promise<{ success: boolean; fromUser?: ServerUser; toUser?: ServerUser }> {
  try {
    const url = new URL(`/api/connection-requests/${requestId}/accept`, getApiUrl());
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      return { success: false };
    }
    
    const data = await response.json();
    return { success: true, fromUser: data.fromUser, toUser: data.toUser };
  } catch {
    return { success: false };
  }
}

export async function rejectConnectionRequest(requestId: number, userId: string): Promise<boolean> {
  try {
    const url = new URL(`/api/connection-requests/${requestId}/reject`, getApiUrl());
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getFamilyMembers(userId: string): Promise<ServerFamilyMember[]> {
  try {
    const url = new URL(`/api/connections/${userId}`, getApiUrl());
    const response = await fetch(url.toString());
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch {
    return [];
  }
}

export async function deleteFamilyConnection(connectionId: string, userId: string): Promise<boolean> {
  try {
    const url = new URL(`/api/connections/${connectionId}`, getApiUrl());
    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export interface ServerTask {
  id: number;
  itemId: string;
  itemSvgData: string;
  itemName: string | null;
  quantity: number;
  note: string | null;
  assignedToId: string;
  assignedToName: string;
  assignedById: string;
  assignedByName: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export async function createTask(task: {
  itemId: string;
  itemSvgData: string;
  itemName: string | null;
  quantity: number;
  note: string | null;
  assignedToId: string;
  assignedToName: string;
  assignedById: string;
  assignedByName: string;
}): Promise<ServerTask | null> {
  try {
    const url = new URL("/api/tasks", getApiUrl());
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

export async function getTasksForUser(userId: string): Promise<ServerTask[]> {
  try {
    const url = new URL(`/api/tasks/${userId}`, getApiUrl());
    const response = await fetch(url.toString());
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch {
    return [];
  }
}

export async function completeTask(taskId: number): Promise<ServerTask | null> {
  try {
    const url = new URL(`/api/tasks/${taskId}/complete`, getApiUrl());
    const response = await fetch(url.toString(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}
