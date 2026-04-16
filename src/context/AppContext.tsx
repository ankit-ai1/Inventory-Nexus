import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { User, Toast, Product, Store, AppNotification, AuditLog, PurchaseOrder, StockTransfer, Supplier, MaintenanceLog, Bin, StockBatch, RMA, AMCContract, AssetDocument, CycleCount, StockAdjustment, LeadTimeRecord } from '../types';
import { supabase, PROFILE_SELECT, STORE_SELECT, PRODUCT_SELECT, NOTIFICATION_SELECT, AUDIT_SELECT, PO_SELECT, TRANSFER_SELECT, SUPPLIER_SELECT, MAINTENANCE_SELECT, BIN_SELECT, BATCH_SELECT, RMA_SELECT, AMC_SELECT, ASSET_DOC_SELECT, CYCLE_COUNT_SELECT, ADJ_SELECT, LEAD_TIME_SELECT } from '../lib/supabase';
import {
  DUMMY_USERS, DUMMY_STORES, DUMMY_PRODUCTS,
  DUMMY_NOTIFICATIONS, DUMMY_AUDIT_LOGS,
  DUMMY_PURCHASE_ORDERS, DUMMY_TRANSFERS,
  DUMMY_SUPPLIERS, DUMMY_MAINTENANCE_LOGS,
  DUMMY_BINS, DUMMY_BATCHES,
  DUMMY_RMAS, DUMMY_AMC_CONTRACTS, DUMMY_ASSET_DOCS,
  DUMMY_CYCLE_COUNTS, DUMMY_STOCK_ADJUSTMENTS, DUMMY_LEAD_TIME_RECORDS,
  LOGIN_CREDENTIALS,
} from '../data/dummy';

const SUPABASE_CONFIGURED = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface AppContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createUser: (data: { name: string; email: string; password: string; role: string; storeId: string; storeName?: string; status: 'active' | 'inactive' }) => Promise<User>;
  patchCurrentUser: (updates: { name?: string }) => Promise<void>;
  dbLoading: boolean;
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
  darkMode: boolean;
  toggleDarkMode: () => void;
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
  // Bins
  bins: Bin[];
  setBins: React.Dispatch<React.SetStateAction<Bin[]>>;
  // Stock Batches
  batches: StockBatch[];
  setBatches: React.Dispatch<React.SetStateAction<StockBatch[]>>;
  // RMA
  rmas: RMA[];
  setRmas: React.Dispatch<React.SetStateAction<RMA[]>>;
  // AMC Contracts
  amcContracts: AMCContract[];
  setAmcContracts: React.Dispatch<React.SetStateAction<AMCContract[]>>;
  // Asset Documents
  assetDocs: AssetDocument[];
  setAssetDocs: React.Dispatch<React.SetStateAction<AssetDocument[]>>;
  // Cycle Counts
  cycleCounts: CycleCount[];
  setCycleCounts: React.Dispatch<React.SetStateAction<CycleCount[]>>;
  // Stock Adjustments
  stockAdjustments: StockAdjustment[];
  setStockAdjustments: React.Dispatch<React.SetStateAction<StockAdjustment[]>>;
  // Lead Time Records
  leadTimeRecords: LeadTimeRecord[];
  setLeadTimeRecords: React.Dispatch<React.SetStateAction<LeadTimeRecord[]>>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(row: any): User {
  return {
    id:         row.id,
    name:       row.name,
    email:      row.email,
    role:       row.role,
    storeId:    row.store_id   ?? undefined,
    storeName:  row.store_name ?? undefined,
    status:     row.status,
    createdAt:  row.created_at,
  };
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('inv_user');
      return cached ? JSON.parse(cached) as User : null;
    } catch { return null; }
  });
  const [dbLoading, setDbLoading] = useState(false);
  const adminCreatingUser = useRef(false);
  const isLoggingIn = useRef(false);

  const setCachedUser = useCallback((user: User | null) => {
    setCurrentUser(user);
    try {
      if (user) localStorage.setItem('inv_user', JSON.stringify(user));
      else localStorage.removeItem('inv_user');
    } catch { /* noop */ }
  }, []);

  const [users,            setUsers]            = useState<User[]>(SUPABASE_CONFIGURED ? [] : DUMMY_USERS);
  const [stores,           setStores]           = useState<Store[]>(SUPABASE_CONFIGURED ? [] : DUMMY_STORES);
  const [products,         setProducts]         = useState<Product[]>(SUPABASE_CONFIGURED ? [] : DUMMY_PRODUCTS);
  const [notifications,    setNotifications]    = useState<AppNotification[]>(SUPABASE_CONFIGURED ? [] : DUMMY_NOTIFICATIONS);
  const [auditLogs,        setAuditLogs]        = useState<AuditLog[]>(SUPABASE_CONFIGURED ? [] : DUMMY_AUDIT_LOGS);
  const [purchaseOrders,   setPurchaseOrders]   = useState<PurchaseOrder[]>(SUPABASE_CONFIGURED ? [] : DUMMY_PURCHASE_ORDERS);
  const [transfers,        setTransfers]        = useState<StockTransfer[]>(SUPABASE_CONFIGURED ? [] : DUMMY_TRANSFERS);
  const [suppliers,        setSuppliers]        = useState<Supplier[]>(SUPABASE_CONFIGURED ? [] : DUMMY_SUPPLIERS);
  const [maintenanceLogs,  setMaintenanceLogs]  = useState<MaintenanceLog[]>(SUPABASE_CONFIGURED ? [] : DUMMY_MAINTENANCE_LOGS);
  const [bins,             setBins]             = useState<Bin[]>(SUPABASE_CONFIGURED ? [] : DUMMY_BINS);
  const [batches,          setBatches]          = useState<StockBatch[]>(SUPABASE_CONFIGURED ? [] : DUMMY_BATCHES);
  const [rmas,             setRmas]             = useState<RMA[]>(SUPABASE_CONFIGURED ? [] : DUMMY_RMAS);
  const [amcContracts,     setAmcContracts]     = useState<AMCContract[]>(SUPABASE_CONFIGURED ? [] : DUMMY_AMC_CONTRACTS);
  const [assetDocs,        setAssetDocs]        = useState<AssetDocument[]>(SUPABASE_CONFIGURED ? [] : DUMMY_ASSET_DOCS);
  const [cycleCounts,      setCycleCounts]      = useState<CycleCount[]>(SUPABASE_CONFIGURED ? [] : DUMMY_CYCLE_COUNTS);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(SUPABASE_CONFIGURED ? [] : DUMMY_STOCK_ADJUSTMENTS);
  const [leadTimeRecords,  setLeadTimeRecords]  = useState<LeadTimeRecord[]>(SUPABASE_CONFIGURED ? [] : DUMMY_LEAD_TIME_RECORDS);

  const [toasts,      setToasts]      = useState<Toast[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode,    setDarkMode]    = useState<boolean>(() => {
    try { return localStorage.getItem('darkMode') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    try { localStorage.setItem('darkMode', String(darkMode)); } catch { /* noop */ }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => setDarkMode(prev => !prev), []);

  // ─── Load all data from Supabase ──────────────────────────
  const loadAllData = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) return;
    try {
      const [
        { data: storesData },
        { data: productsData },
        { data: profilesData },
      ] = await Promise.all([
        supabase.from('stores').select(STORE_SELECT).order('created_at'),
        supabase.from('products').select(PRODUCT_SELECT).order('created_at'),
        supabase.from('profiles').select('*').order('created_at'),
      ]);

      if (storesData)   setStores(storesData as Store[]);
      if (productsData) setProducts(productsData as Product[]);
      if (profilesData) setUsers(profilesData.map(mapProfile));
    } catch (err) {
      console.error('Critical load error:', err);
    }

    // Secondary tables — fire and forget, don't block caller
    void (async () => {
      try {
      const [
        { data: notifsData },
        { data: auditData },
        { data: posData },
        { data: transfersData },
        { data: suppliersData },
        { data: maintenanceData },
        { data: binsData },
        { data: batchesData },
        { data: rmasData },
        { data: amcData },
        { data: assetDocsData },
        { data: ccData },
        { data: adjData },
        { data: ltData },
      ] = await Promise.all([
        supabase.from('notifications').select(NOTIFICATION_SELECT).order('created_at', { ascending: false }),
        supabase.from('audit_logs').select(AUDIT_SELECT).order('timestamp', { ascending: false }),
        supabase.from('purchase_orders').select(PO_SELECT).order('requested_at', { ascending: false }),
        supabase.from('stock_transfers').select(TRANSFER_SELECT).order('requested_at', { ascending: false }),
        supabase.from('suppliers').select(SUPPLIER_SELECT).order('created_at'),
        supabase.from('maintenance_logs').select(MAINTENANCE_SELECT).order('created_at', { ascending: false }),
        supabase.from('bins').select(BIN_SELECT).order('bin_code'),
        supabase.from('stock_batches').select(BATCH_SELECT).order('expiry_date'),
        supabase.from('rmas').select(RMA_SELECT).order('initiated_at', { ascending: false }),
        supabase.from('amc_contracts').select(AMC_SELECT).order('created_at', { ascending: false }),
        supabase.from('asset_documents').select(ASSET_DOC_SELECT).order('uploaded_at', { ascending: false }),
        supabase.from('cycle_counts').select(CYCLE_COUNT_SELECT).order('created_at', { ascending: false }),
        supabase.from('stock_adjustments').select(ADJ_SELECT).order('requested_at', { ascending: false }),
        supabase.from('lead_time_records').select(LEAD_TIME_SELECT).order('ordered_at', { ascending: false }),
      ]);

      if (notifsData)      setNotifications(notifsData as AppNotification[]);
      if (auditData)       setAuditLogs(auditData as AuditLog[]);
      if (posData)         setPurchaseOrders(posData as PurchaseOrder[]);
      if (transfersData)   setTransfers(transfersData as StockTransfer[]);
      if (suppliersData)   setSuppliers(suppliersData as Supplier[]);
      if (maintenanceData) setMaintenanceLogs(maintenanceData as MaintenanceLog[]);
      if (binsData)        setBins(binsData as Bin[]);
      if (batchesData)     setBatches(batchesData as StockBatch[]);
      if (rmasData)        setRmas(rmasData as RMA[]);
      if (amcData)         setAmcContracts(amcData as AMCContract[]);
      if (assetDocsData)   setAssetDocs(assetDocsData as AssetDocument[]);
      if (ccData)          setCycleCounts(ccData as CycleCount[]);
      if (adjData)         setStockAdjustments(adjData as StockAdjustment[]);
      if (ltData)          setLeadTimeRecords(ltData as LeadTimeRecord[]);
    } catch (err) {
      console.error('Secondary load error:', err);
      }
    })();
  }, []);

  // ─── Restore session on mount ──────────────────────────────
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      try {
        if (error) { await supabase.auth.signOut(); setCachedUser(null); return; }
        if (!session?.user) { setCachedUser(null); return; }
        const { data: profile } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) setCachedUser(mapProfile(profile));
        else setCachedUser(null);
        loadAllData(); // fire, don't await
      } catch (err) {
        console.error('Session restore error:', err);
      }
    }).catch(err => console.error('getSession error:', err));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (adminCreatingUser.current) return;
      if (event === 'SIGNED_OUT') {
        if (isLoggingIn.current) return; // don't clear user during login flow
        setCachedUser(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) setCachedUser(mapProfile(profile));
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAllData]);

  // ─── Login ─────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    if (!SUPABASE_CONFIGURED) {
      const cred = LOGIN_CREDENTIALS.find(c => c.email === email && c.password === password);
      if (!cred) throw new Error('Incorrect email or password.');
      const user = DUMMY_USERS.find(u => u.id === cred.userId);
      if (!user) throw new Error('User not found.');
      setCachedUser(user);
      return;
    }

    // Clear any stale session before signing in
    isLoggingIn.current = true;
    try { await supabase.auth.signOut(); } catch { /* noop */ }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    isLoggingIn.current = false;
    if (error) throw new Error(error.message);

    const { data: profile, error: profErr } = await supabase
      .from('profiles').select('*').eq('id', data.user.id).single();
    if (profErr || !profile) throw new Error(`Profile not found (${profErr?.message ?? 'no row'}). Contact your administrator.`);

    setCachedUser(mapProfile(profile));
    loadAllData(); // fire in background, don't block login
  }, [loadAllData, setCachedUser]);

  // ─── Logout ────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    setCachedUser(null);
    if (SUPABASE_CONFIGURED) supabase.auth.signOut(); // fire, don't await
  }, [setCachedUser]);

  // ─── Create User (admin) ───────────────────────────────────
  const createUser = useCallback(async (data: {
    name: string; email: string; password: string;
    role: string; storeId: string; storeName?: string; status: 'active' | 'inactive';
  }): Promise<User> => {
    if (!SUPABASE_CONFIGURED) {
      const u: User = {
        id: 'u' + Date.now(), name: data.name, email: data.email,
        role: data.role as User['role'], storeId: data.storeId,
        storeName: data.storeName, status: data.status,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setUsers(prev => [u, ...prev]);
      return u;
    }

    const { data: { session: adminSession } } = await supabase.auth.getSession();

    adminCreatingUser.current = true;
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { name: data.name, role: data.role, store_id: data.storeId || null, store_name: data.storeName || null } },
      });
      if (signUpError) throw new Error(signUpError.message);
      if (!signUpData.user) throw new Error('User creation failed.');

      // Restore admin session
      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });
      }

      // Update profile with correct role/store/status
      await supabase.from('profiles').update({
        role: data.role, store_id: data.storeId || null,
        store_name: data.storeName || null, status: data.status,
      }).eq('id', signUpData.user.id);

      const newUser: User = {
        id: signUpData.user.id, name: data.name, email: data.email,
        role: data.role as User['role'], storeId: data.storeId,
        storeName: data.storeName, status: data.status,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setUsers(prev => [newUser, ...prev]);
      return newUser;
    } finally {
      adminCreatingUser.current = false;
    }
  }, []);

  // ─── Toasts ────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // ─── Notifications ─────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.read).length;

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (SUPABASE_CONFIGURED)
      await supabase.from('notifications').update({ read: true }).eq('id', id);
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (SUPABASE_CONFIGURED)
      await supabase.from('notifications').update({ read: true }).eq('read', false);
  }, []);

  const addNotification = useCallback(async (entry: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const n: AppNotification = {
      ...entry, id: 'n' + Date.now(), read: false, createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [n, ...prev]);
    if (SUPABASE_CONFIGURED) {
      await supabase.from('notifications').insert({
        id: n.id, type: n.type, title: n.title, message: n.message,
        read: false, created_at: n.createdAt,
        store_id: n.storeId ?? null, product_id: n.productId ?? null, link: n.link ?? null,
      });
    }
  }, []);

  // ─── Patch current user profile ────────────────────────────
  const patchCurrentUser = useCallback(async (updates: { name?: string }) => {
    setCurrentUser(user => {
      if (!user) return user;
      const updated = { ...user, ...updates };
      try { localStorage.setItem('inv_user', JSON.stringify(updated)); } catch { /* noop */ }
      if (SUPABASE_CONFIGURED && updates.name) {
        supabase.from('profiles').update({ name: updates.name }).eq('id', user.id);
      }
      return updated;
    });
  }, []);

  // ─── Audit log ─────────────────────────────────────────────
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
        if (SUPABASE_CONFIGURED) {
          supabase.from('audit_logs').insert({
            id: log.id, action: log.action, module: log.module,
            entity_id: log.entityId, entity_name: log.entityName,
            details: log.details, user_id: log.userId, user_name: log.userName,
            timestamp: log.timestamp, changes: log.changes ?? null,
          });
        }
      }
      return user;
    });
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser, login, logout, createUser, patchCurrentUser, dbLoading,
      users, setUsers,
      stores, setStores,
      products, setProducts,
      toasts, showToast,
      sidebarOpen, setSidebarOpen,
      darkMode, toggleDarkMode,
      notifications, setNotifications,
      markNotificationRead, markAllNotificationsRead, addNotification,
      unreadCount,
      auditLogs, addAuditLog,
      purchaseOrders, setPurchaseOrders,
      transfers, setTransfers,
      suppliers, setSuppliers,
      maintenanceLogs, setMaintenanceLogs,
      bins, setBins,
      batches, setBatches,
      rmas, setRmas,
      amcContracts, setAmcContracts,
      assetDocs, setAssetDocs,
      cycleCounts, setCycleCounts,
      stockAdjustments, setStockAdjustments,
      leadTimeRecords, setLeadTimeRecords,
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
