import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User, Toast, Product, Store, AppNotification, AuditLog, PurchaseOrder, StockTransfer, Supplier, MaintenanceLog } from '../types';
import {
  DUMMY_USERS, DUMMY_STORES, DUMMY_PRODUCTS,
  DUMMY_NOTIFICATIONS, DUMMY_AUDIT_LOGS,
  DUMMY_PURCHASE_ORDERS, DUMMY_TRANSFERS,
  DUMMY_SUPPLIERS, DUMMY_MAINTENANCE_LOGS,
} from '../data/dummy';

interface AppContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  // Core data
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  stores: Store[];
  setStores: React.Dispatch<React.SetStateAction<Store[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error') => void;
  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Notifications
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  unreadCount: number;
  // Audit logs
  auditLogs: AuditLog[];
  addAuditLog: (entry: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName'>) => void;
  // Purchase orders
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  // Transfers
  transfers: StockTransfer[];
  setTransfers: React.Dispatch<React.SetStateAction<StockTransfer[]>>;
  // Suppliers
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  // Maintenance
  maintenanceLogs: MaintenanceLog[];
  setMaintenanceLogs: React.Dispatch<React.SetStateAction<MaintenanceLog[]>>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(DUMMY_USERS);
  const [stores, setStores] = useState<Store[]>(DUMMY_STORES);
  const [products, setProducts] = useState<Product[]>(DUMMY_PRODUCTS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(DUMMY_NOTIFICATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(DUMMY_AUDIT_LOGS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(DUMMY_PURCHASE_ORDERS);
  const [transfers, setTransfers] = useState<StockTransfer[]>(DUMMY_TRANSFERS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(DUMMY_SUPPLIERS);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>(DUMMY_MAINTENANCE_LOGS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const login = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const addNotification = useCallback((entry: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const n: AppNotification = {
      ...entry,
      id: 'n' + Date.now(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [n, ...prev]);
  }, []);

  const addAuditLog = useCallback((entry: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName'>) => {
    setCurrentUser(user => {
      if (user) {
        const log: AuditLog = {
          ...entry,
          id: 'al' + Date.now(),
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.name,
        };
        setAuditLogs(prev => [log, ...prev]);
      }
      return user;
    });
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser, login, logout,
      users, setUsers,
      stores, setStores,
      products, setProducts,
      toasts, showToast,
      sidebarOpen, setSidebarOpen,
      notifications, setNotifications,
      markNotificationRead, markAllNotificationsRead, addNotification,
      unreadCount,
      auditLogs, addAuditLog,
      purchaseOrders, setPurchaseOrders,
      transfers, setTransfers,
      suppliers, setSuppliers,
      maintenanceLogs, setMaintenanceLogs,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
