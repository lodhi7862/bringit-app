import { registerAppUser as registerAppUserApi, createTask as createTaskApi, getTasksForUser, completeTask as completeTaskApi, ServerTask } from "./api";

export type UserRole = 'parent' | 'child';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatarSvg: string | null;
  createdAt: number;
}

export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  role: UserRole;
  avatarSvg: string | null;
  connectedAt: number;
  status: 'pending' | 'accepted';
}

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserRole: UserRole;
  fromUserAvatar: string | null;
  toUserId: string;
  toUserName: string;
  toUserRole: UserRole;
  toUserAvatar: string | null;
  createdAt: number;
}

export interface SavedItem {
  id: string;
  svgData: string;
  name: string | null;
  lastNote: string | null;
  lastUsedAt: number;
  createdAt: number;
}

export interface Task {
  id: string;
  itemId: string;
  itemSvgData: string;
  itemName: string | null;
  quantity: number;
  note: string | null;
  assignedToId: string;
  assignedToName: string;
  assignedById: string;
  assignedByName: string;
  status: 'pending' | 'completed';
  createdAt: number;
  completedAt: number | null;
}

export interface Notification {
  id: string;
  type: 'task_completed';
  taskId: string;
  itemName: string | null;
  completedByName: string;
  read: boolean;
  createdAt: number;
}

export interface OrderItem {
  id: string;
  savedItemId: string;
  svgData: string;
  name: string | null;
  quantity: number;
  note: string | null;
  completed: boolean;
  clarificationNote: string | null;
  replacementSvg: string | null;
}

export interface Order {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  items: OrderItem[];
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: number;
  completedAt: number | null;
}

export interface AppState {
  currentUser: User | null;
  familyMembers: FamilyMember[];
  savedItems: SavedItem[];
  tasks: Task[];
  notifications: Notification[];
  orders: Order[];
  pendingConnections: FamilyMember[];
  registeredUsers: User[];
  incomingRequests: ConnectionRequest[];
  outgoingRequests: ConnectionRequest[];
  seenTaskIds: Set<string>;
}

let state: AppState = {
  currentUser: null,
  familyMembers: [],
  savedItems: [],
  tasks: [],
  notifications: [],
  orders: [],
  pendingConnections: [],
  registeredUsers: [],
  incomingRequests: [],
  outgoingRequests: [],
  seenTaskIds: new Set(),
};

let listeners: (() => void)[] = [];

export function getState(): AppState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function notifyListeners() {
  listeners.forEach(l => l());
}

function generateId(): string {
  // Generate 8-character alphanumeric ID (matches what's shown in UI)
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createUser(name: string, role: UserRole, avatarSvg: string | null): Promise<User> {
  const user: User = {
    id: generateId(),
    name,
    role,
    avatarSvg,
    createdAt: Date.now(),
  };
  
  // Register on server for cross-device discovery
  try {
    await registerAppUserApi({
      id: user.id,
      name: user.name,
      role: user.role,
      avatarSvg: user.avatarSvg,
    });
  } catch (error) {
    console.error("Failed to register user on server:", error);
  }
  
  state = { 
    ...state, 
    currentUser: user,
    registeredUsers: [...state.registeredUsers, user],
  };
  notifyListeners();
  return user;
}

export function findUserByCode(code: string): User | null {
  const normalizedCode = code.trim().toLowerCase();
  return state.registeredUsers.find(u => 
    u.id.toLowerCase().startsWith(normalizedCode) ||
    u.id.toLowerCase() === normalizedCode
  ) || null;
}

export function sendConnectionRequest(toUserId: string): ConnectionRequest | null {
  if (!state.currentUser) return null;
  
  const targetUser = state.registeredUsers.find(u => u.id === toUserId);
  if (!targetUser) return null;
  
  const existingRequest = state.outgoingRequests.find(r => r.toUserId === toUserId);
  if (existingRequest) return null;
  
  const alreadyConnected = state.familyMembers.find(m => m.userId === toUserId);
  if (alreadyConnected) return null;
  
  const request: ConnectionRequest = {
    id: generateId(),
    fromUserId: state.currentUser.id,
    fromUserName: state.currentUser.name,
    fromUserRole: state.currentUser.role,
    fromUserAvatar: state.currentUser.avatarSvg,
    toUserId: targetUser.id,
    toUserName: targetUser.name,
    toUserRole: targetUser.role,
    toUserAvatar: targetUser.avatarSvg,
    createdAt: Date.now(),
  };
  
  state = { 
    ...state, 
    outgoingRequests: [...state.outgoingRequests, request],
    incomingRequests: [...state.incomingRequests, request],
  };
  notifyListeners();
  return request;
}

export function sendConnectionRequestByCode(code: string): ConnectionRequest | null {
  if (!state.currentUser) return null;
  
  const normalizedCode = code.trim();
  if (!normalizedCode) return null;
  
  if (normalizedCode === state.currentUser.id) return null;
  
  const existingRequest = state.outgoingRequests.find(r => r.toUserId === normalizedCode);
  if (existingRequest) return null;
  
  const alreadyConnected = state.familyMembers.find(m => m.userId === normalizedCode);
  if (alreadyConnected) return null;
  
  const knownUser = state.registeredUsers.find(u => u.id === normalizedCode);
  
  const request: ConnectionRequest = {
    id: generateId(),
    fromUserId: state.currentUser.id,
    fromUserName: state.currentUser.name,
    fromUserRole: state.currentUser.role,
    fromUserAvatar: state.currentUser.avatarSvg,
    toUserId: normalizedCode,
    toUserName: knownUser?.name || "Family Member",
    toUserRole: knownUser?.role || (state.currentUser.role === 'parent' ? 'child' : 'parent'),
    toUserAvatar: knownUser?.avatarSvg || null,
    createdAt: Date.now(),
  };
  
  state = { 
    ...state, 
    outgoingRequests: [...state.outgoingRequests, request],
    incomingRequests: [...state.incomingRequests, request],
  };
  notifyListeners();
  return request;
}

export function acceptConnectionRequest(requestId: string): void {
  const request = state.incomingRequests.find(r => r.id === requestId);
  if (!request) return;
  if (!state.currentUser) return;
  if (request.toUserId !== state.currentUser.id) return;
  
  const connectionTime = Date.now();
  
  const memberForAcceptor: FamilyMember = {
    id: generateId(),
    userId: request.fromUserId,
    name: request.fromUserName,
    role: request.fromUserRole,
    avatarSvg: request.fromUserAvatar,
    connectedAt: connectionTime,
    status: 'accepted',
  };
  
  const memberForRequester: FamilyMember = {
    id: generateId(),
    userId: request.toUserId,
    name: request.toUserName,
    role: request.toUserRole,
    avatarSvg: request.toUserAvatar,
    connectedAt: connectionTime,
    status: 'accepted',
  };
  
  state = {
    ...state,
    familyMembers: [...state.familyMembers, memberForAcceptor, memberForRequester],
    incomingRequests: state.incomingRequests.filter(r => r.id !== requestId),
    outgoingRequests: state.outgoingRequests.filter(r => r.id !== requestId),
  };
  notifyListeners();
}

export function rejectConnectionRequest(requestId: string): void {
  state = {
    ...state,
    incomingRequests: state.incomingRequests.filter(r => r.id !== requestId),
    outgoingRequests: state.outgoingRequests.filter(r => r.id !== requestId),
  };
  notifyListeners();
}

export function getIncomingRequestsForCurrentUser(): ConnectionRequest[] {
  if (!state.currentUser) return [];
  return state.incomingRequests.filter(r => r.toUserId === state.currentUser!.id);
}

export function getOutgoingRequestsForCurrentUser(): ConnectionRequest[] {
  if (!state.currentUser) return [];
  return state.outgoingRequests.filter(r => r.fromUserId === state.currentUser!.id);
}

export function getFamilyMembersForCurrentUser(): FamilyMember[] {
  if (!state.currentUser) return [];
  return state.familyMembers.filter(m => 
    m.userId !== state.currentUser!.id && m.status === 'accepted'
  );
}

export function updateUser(updates: Partial<Pick<User, 'name' | 'avatarSvg'>>): User | null {
  if (!state.currentUser) return null;
  state = {
    ...state,
    currentUser: { ...state.currentUser, ...updates },
  };
  notifyListeners();
  return state.currentUser;
}

export function addFamilyMember(member: Omit<FamilyMember, 'id' | 'connectedAt'>): FamilyMember {
  const newMember: FamilyMember = {
    ...member,
    id: generateId(),
    connectedAt: Date.now(),
  };
  state = { ...state, familyMembers: [...state.familyMembers, newMember] };
  notifyListeners();
  return newMember;
}

export function acceptConnection(memberId: string): void {
  const pending = state.pendingConnections.find(m => m.id === memberId);
  if (pending) {
    const acceptedMember: FamilyMember = {
      ...pending,
      status: 'accepted',
      connectedAt: Date.now(),
    };
    state = {
      ...state,
      familyMembers: [...state.familyMembers, acceptedMember],
      pendingConnections: state.pendingConnections.filter(m => m.id !== memberId),
    };
  } else {
    state = {
      ...state,
      familyMembers: state.familyMembers.map(m =>
        m.id === memberId ? { ...m, status: 'accepted' as const } : m
      ),
    };
  }
  notifyListeners();
}

export function addPendingConnection(member: Omit<FamilyMember, 'id' | 'connectedAt' | 'status'>): FamilyMember {
  const newMember: FamilyMember = {
    ...member,
    id: generateId(),
    connectedAt: Date.now(),
    status: 'pending',
  };
  state = { ...state, pendingConnections: [...state.pendingConnections, newMember] };
  notifyListeners();
  return newMember;
}

export function removeFamilyMember(memberId: string): void {
  state = {
    ...state,
    familyMembers: state.familyMembers.filter(m => m.id !== memberId),
  };
  notifyListeners();
}

export function removePendingConnection(memberId: string): void {
  state = {
    ...state,
    pendingConnections: state.pendingConnections.filter(m => m.id !== memberId),
  };
  notifyListeners();
}

export function addSavedItem(item: Omit<SavedItem, 'id' | 'createdAt' | 'lastUsedAt'>): SavedItem {
  const newItem: SavedItem = {
    ...item,
    id: generateId(),
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  };
  state = { ...state, savedItems: [...state.savedItems, newItem] };
  notifyListeners();
  return newItem;
}

export function updateSavedItem(itemId: string, updates: Partial<Pick<SavedItem, 'name' | 'lastNote'>>): SavedItem | null {
  const item = state.savedItems.find(i => i.id === itemId);
  if (!item) return null;
  const updated = { ...item, ...updates };
  state = {
    ...state,
    savedItems: state.savedItems.map(i => i.id === itemId ? updated : i),
  };
  notifyListeners();
  return updated;
}

export function removeSavedItem(itemId: string): void {
  state = {
    ...state,
    savedItems: state.savedItems.filter(i => i.id !== itemId),
  };
  notifyListeners();
}

export async function assignTask(
  item: SavedItem,
  assignedToId: string,
  assignedToName: string,
  quantity: number = 1,
  note: string | null = null
): Promise<Task | null> {
  if (!state.currentUser) return null;
  if (state.currentUser.role !== 'parent') return null;
  
  const taskData = {
    itemId: item.id,
    itemSvgData: item.svgData,
    itemName: item.name,
    quantity,
    note,
    assignedToId,
    assignedToName,
    assignedById: state.currentUser.id,
    assignedByName: state.currentUser.name,
  };
  
  const serverTask = await createTaskApi(taskData);
  if (!serverTask) return null;
  
  const task: Task = {
    id: serverTask.id.toString(),
    itemId: serverTask.itemId,
    itemSvgData: serverTask.itemSvgData,
    itemName: serverTask.itemName,
    quantity: serverTask.quantity,
    note: serverTask.note,
    assignedToId: serverTask.assignedToId,
    assignedToName: serverTask.assignedToName,
    assignedById: serverTask.assignedById,
    assignedByName: serverTask.assignedByName,
    status: serverTask.status as 'pending' | 'completed',
    createdAt: new Date(serverTask.createdAt).getTime(),
    completedAt: serverTask.completedAt ? new Date(serverTask.completedAt).getTime() : null,
  };
  
  state = { ...state, tasks: [...state.tasks, task] };
  notifyListeners();
  return task;
}

export async function markTaskDone(taskId: string): Promise<void> {
  if (!state.currentUser) return;
  if (state.currentUser.role !== 'child') return;
  
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  if (task.assignedToId !== state.currentUser.id) return;
  
  const serverTask = await completeTaskApi(parseInt(taskId));
  if (!serverTask) return;
  
  state = {
    ...state,
    tasks: state.tasks.map(t =>
      t.id === taskId
        ? { ...t, status: 'completed' as const, completedAt: Date.now() }
        : t
    ),
  };
  
  const notification: Notification = {
    id: generateId(),
    type: 'task_completed',
    taskId,
    itemName: task.itemName,
    completedByName: state.currentUser!.name,
    read: false,
    createdAt: Date.now(),
  };
  state = { ...state, notifications: [...state.notifications, notification] };
  
  notifyListeners();
}

export async function loadTasksFromServer(userId: string): Promise<{ newlyCompleted: Task[] }> {
  const serverTasks = await getTasksForUser(userId);
  const fetchedTasks: Task[] = serverTasks.map(st => ({
    id: st.id.toString(),
    itemId: st.itemId,
    itemSvgData: st.itemSvgData,
    itemName: st.itemName,
    quantity: st.quantity,
    note: st.note,
    assignedToId: st.assignedToId,
    assignedToName: st.assignedToName,
    assignedById: st.assignedById,
    assignedByName: st.assignedByName,
    status: st.status as 'pending' | 'completed',
    createdAt: new Date(st.createdAt).getTime(),
    completedAt: st.completedAt ? new Date(st.completedAt).getTime() : null,
  }));
  
  const existingTasksMap = new Map(state.tasks.map(t => [t.id, t]));
  const newlyCompleted: Task[] = [];
  
  for (const task of fetchedTasks) {
    const existing = existingTasksMap.get(task.id);
    if (existing && existing.status === 'pending' && task.status === 'completed') {
      newlyCompleted.push(task);
    }
  }
  
  const fetchedTaskIds = new Set(fetchedTasks.map(t => t.id));
  const otherTasks = state.tasks.filter(t => !fetchedTaskIds.has(t.id));
  const mergedTasks = [...otherTasks, ...fetchedTasks];
  state = { ...state, tasks: mergedTasks };
  notifyListeners();
  
  return { newlyCompleted };
}

export function markNotificationRead(notificationId: string): void {
  state = {
    ...state,
    notifications: state.notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    ),
  };
  notifyListeners();
}

export function markAllNotificationsRead(): void {
  state = {
    ...state,
    notifications: state.notifications.map(n => ({ ...n, read: true })),
  };
  notifyListeners();
}

export function getUnreadNotificationCount(): number {
  return state.notifications.filter(n => !n.read).length;
}

export function getChildTasks(childId: string): Task[] {
  return state.tasks.filter(t => t.assignedToId === childId && t.status === 'pending');
}

export function getChildCompletedTasks(childId: string): Task[] {
  return state.tasks.filter(t => t.assignedToId === childId && t.status === 'completed');
}

export function getParentAssignedTasks(parentId: string): Task[] {
  return state.tasks.filter(t => t.assignedById === parentId);
}

export function createOrder(
  receiverId: string,
  receiverName: string,
  items: Omit<OrderItem, 'id' | 'completed' | 'clarificationNote' | 'replacementSvg'>[]
): Order | null {
  if (!state.currentUser) return null;
  
  const order: Order = {
    id: generateId(),
    senderId: state.currentUser.id,
    senderName: state.currentUser.name,
    receiverId,
    receiverName,
    items: items.map(item => ({
      ...item,
      id: generateId(),
      completed: false,
      clarificationNote: null,
      replacementSvg: null,
    })),
    status: 'pending',
    createdAt: Date.now(),
    completedAt: null,
  };
  state = { ...state, orders: [...state.orders, order] };
  notifyListeners();
  return order;
}

export function markItemCompleted(orderId: string, itemId: string, clarificationNote?: string, replacementSvg?: string): void {
  state = {
    ...state,
    orders: state.orders.map(order => {
      if (order.id !== orderId) return order;
      const updatedItems = order.items.map(item =>
        item.id === itemId
          ? {
              ...item,
              completed: true,
              clarificationNote: clarificationNote || null,
              replacementSvg: replacementSvg || null,
            }
          : item
      );
      const allCompleted = updatedItems.every(i => i.completed);
      const someCompleted = updatedItems.some(i => i.completed);
      return {
        ...order,
        items: updatedItems,
        status: allCompleted ? 'completed' as const : someCompleted ? 'in_progress' as const : 'pending' as const,
      };
    }),
  };
  notifyListeners();
}

export function completeOrder(orderId: string): void {
  state = {
    ...state,
    orders: state.orders.map(order =>
      order.id === orderId
        ? { ...order, status: 'completed' as const, completedAt: Date.now() }
        : order
    ),
  };
  notifyListeners();
}

export function deleteOrder(orderId: string): void {
  state = {
    ...state,
    orders: state.orders.filter(o => o.id !== orderId),
  };
  notifyListeners();
}

export function getUnseenPendingTaskCount(): number {
  if (!state.currentUser) return 0;
  const pendingTasks = state.tasks.filter(t => 
    t.assignedToId === state.currentUser!.id && t.status === 'pending'
  );
  return pendingTasks.filter(t => !state.seenTaskIds.has(t.id)).length;
}

export function markTasksAsSeen(): void {
  if (!state.currentUser) return;
  const pendingTasks = state.tasks.filter(t => 
    t.assignedToId === state.currentUser!.id && t.status === 'pending'
  );
  const newSeenIds = new Set(state.seenTaskIds);
  pendingTasks.forEach(t => newSeenIds.add(t.id));
  state = { ...state, seenTaskIds: newSeenIds };
  notifyListeners();
}

export function useStore(): AppState {
  return state;
}

export function useStoreWithSubscription(): [AppState, () => void] {
  return [state, notifyListeners];
}
