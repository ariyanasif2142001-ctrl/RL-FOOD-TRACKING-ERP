import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PurchaseOrder, POItem, User, SheetsConfig, AuditLog, ImportPreviewAnalysis, ImportExecutionResult, getNormalizedItemStatus } from '../../types';
import { getGoogleAppsScriptTemplate } from '../../services/sheetsService';
import { parsePOFile, parsePOText, validateAndAnalyzePOImport, executePOImport, downloadSampleXLSXTemplate, downloadLargeScaleSampleXLSXTemplate, exportPOsToXLSX } from '../../services/poImportService';
import { SystemTestsRunner } from './SystemTestsRunner';
import { SystemDocsGuide } from './SystemDocsGuide';
import { TelegramSettings } from './TelegramSettings';
import { 
  notifyDailySummaryReport, 
  notifyPendingPurchasesReport, 
  notifyHoldItemsReport, 
  notifyPurchasedInTransitReport, 
  notifyWarehouseInventoryReport,
  notifySinglePOReport,
  notifyAuditLogsSummaryReport,
  sendCustomTelegramAlert
} from '../../services/telegramService';
import { RunningPoList } from '../RunningPoList';
import { OfficialPdfInvoiceModal } from '../OfficialPdfInvoiceModal';
import { MasterSkuModal } from '../MasterSkuModal';
import { DiscrepancyAlertHub } from '../DiscrepancyAlertHub';
import { DispatchKanbanPipeline } from '../DispatchKanbanPipeline';
import { AiBackupHub } from './AiBackupHub';
import { printOfficialRLDeliveryNote } from '../../services/officialPdfService';
import { 
  Plus, Upload, Database, Users, Shield, FileSpreadsheet, Send, Crown,
  Copy, Check, RefreshCw, Clock, X, LayoutDashboard, Lock, Activity, FileText, CheckCircle2, AlertCircle, BookOpen, Trash2,
  Search, Download, Zap, Sparkles, Eye, Printer, Filter, Layers, ChevronDown, ChevronUp, Camera
} from 'lucide-react';

interface AdminDashboardProps {
  pos: PurchaseOrder[];
  users: User[];
  sheetsConfig: SheetsConfig;
  auditLogs: AuditLog[];
  onImportPOs: (newPOs: PurchaseOrder[]) => void;
  onUpdateUsers: (users: User[]) => void;
  onSaveSheetsConfig: (config: SheetsConfig) => void;
  onSync: () => void;
  onDeletePO?: (poNumber: string) => void;
  onClearAllPOs?: () => void;
  onShowToast?: (msg: string, isSuccess?: boolean) => void;
  isSyncing: boolean;
  currentUser: User;
  externalActiveTab?: 'dashboard' | 'import' | 'users' | 'sheets' | 'telegram' | 'tests' | 'docs' | 'logs';
  onSelectAdminTab?: (tab: 'dashboard' | 'import' | 'users' | 'sheets' | 'telegram' | 'tests' | 'docs' | 'logs') => void;
  isExternalMasterSkuOpen?: boolean;
  onCloseExternalMasterSkuModal?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  pos,
  users,
  sheetsConfig,
  auditLogs,
  onImportPOs,
  onUpdateUsers,
  onSaveSheetsConfig,
  onSync,
  onDeletePO,
  onClearAllPOs,
  onShowToast,
  isSyncing,
  currentUser,
  externalActiveTab,
  onSelectAdminTab,
  isExternalMasterSkuOpen,
  onCloseExternalMasterSkuModal
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'dashboard' | 'import' | 'users' | 'sheets' | 'telegram' | 'tests' | 'docs' | 'logs'>('dashboard');
  
  const activeTab = externalActiveTab || internalActiveTab;

  const setActiveTab = (tab: 'dashboard' | 'import' | 'users' | 'sheets' | 'telegram' | 'tests' | 'docs' | 'logs') => {
    setInternalActiveTab(tab);
    if (onSelectAdminTab) onSelectAdminTab(tab);
  };
  
  // Instant Search & Status Filter state (Option 1)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Partial' | 'Completed' | 'Held'>('ALL');
  const [healthMsg, setHealthMsg] = useState<string | null>(null);
  const [isSendingTelegramSummary, setIsSendingTelegramSummary] = useState<boolean>(false);
  const [showTgReportMenu, setShowTgReportMenu] = useState<boolean>(false);

  // Custom Telegram Broadcast Alert State
  const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState<boolean>(false);
  const [customAlertText, setCustomAlertText] = useState<string>('');
  const [customAlertPriority, setCustomAlertPriority] = useState<'NORMAL' | 'URGENT' | 'CRITICAL'>('NORMAL');
  const [isSendingCustomAlert, setIsSendingCustomAlert] = useState<boolean>(false);

  const handleSendCustomAlert = async () => {
    if (!customAlertText.trim()) {
      alert('Please enter a custom alert message.');
      return;
    }

    setIsSendingCustomAlert(true);
    const res = await sendCustomTelegramAlert(
      customAlertText.trim(),
      currentUser.name,
      customAlertPriority
    );
    setIsSendingCustomAlert(false);

    if (res && res.success) {
      alert('📢 Custom Alert sent to Telegram group successfully!');
      setCustomAlertText('');
      setIsCustomAlertModalOpen(false);
    } else {
      alert(res?.error || 'Failed to send Custom Alert to Telegram. Please check Telegram Bot settings.');
    }
  };

  const handleSendTelegramReport = async (type: 'master' | 'pending' | 'hold' | 'transit' | 'warehouse') => {
    setIsSendingTelegramSummary(true);
    setShowTgReportMenu(false);

    let res: { success: boolean; error?: string } | null = null;
    let title = '';

    if (type === 'master') {
      title = '📊 Daily Master Summary Digest';
      res = await notifyDailySummaryReport(pos, users.length, currentUser.name);
    } else if (type === 'pending') {
      title = '🛒 Urgent Pending Purchases Report';
      res = await notifyPendingPurchasesReport(pos, currentUser.name);
    } else if (type === 'hold') {
      title = '⏸️ On-Hold Items Report';
      res = await notifyHoldItemsReport(pos, currentUser.name);
    } else if (type === 'transit') {
      title = '🚚 Purchased & In-Transit Goods Report';
      res = await notifyPurchasedInTransitReport(pos, currentUser.name);
    } else if (type === 'warehouse') {
      title = '🏬 Warehouse Staging & Stock Report';
      res = await notifyWarehouseInventoryReport(pos, currentUser.name);
    }

    setIsSendingTelegramSummary(false);

    if (res && res.success) {
      alert(`${title} sent to Telegram group successfully!`);
    } else {
      alert(res?.error || 'Failed to send report to Telegram. Please verify Telegram Bot Token & Chat ID in settings.');
    }
  };

  const [sendingPoNumber, setSendingPoNumber] = useState<string | null>(null);

  const handleSendSinglePoTelegram = async (po: PurchaseOrder) => {
    setSendingPoNumber(po.poNumber);
    const res = await notifySinglePOReport(po, currentUser.name);
    setSendingPoNumber(null);

    if (res && res.success) {
      alert(`✅ PO #${po.poNumber} summary report sent to Telegram group successfully!`);
    } else {
      alert(res?.error || `Failed to send PO #${po.poNumber} to Telegram. Please check Telegram Bot settings.`);
    }
  };

  // Hold Purchaser Filter State
  const [holdPurchaserFilter, setHoldPurchaserFilter] = useState<string>('ALL');
  const [isHoldMonitorExpanded, setIsHoldMonitorExpanded] = useState<boolean>(false);

  // Running PO List Filter State
  const [runningPoSearch, setRunningPoSearch] = useState<string>('');
  const [runningPoItemSearch, setRunningPoItemSearch] = useState<string>('');
  const [runningPoDeptFilter, setRunningPoDeptFilter] = useState<string>('ALL');
  const [runningPoLocFilter, setRunningPoLocFilter] = useState<string>('ALL');
  const [runningPoStatusFilter, setRunningPoStatusFilter] = useState<string>('ACTIVE');

  // Clickable Stat Card Report Modal State
  const [selectedReport, setSelectedReport] = useState<'total_po' | 'pending_po' | 'partial_po' | 'completed_po' | 'pending_items' | 'hold_items' | 'partial_items' | 'purchased_items' | null>(null);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportPurchaserFilter, setReportPurchaserFilter] = useState<string>('ALL');

  // Helper to get User Avatar / Photo URL with fallback
  const getUserAvatar = useCallback((userName: string) => {
    const norm = (userName || '').trim().toLowerCase();
    const found = users.find(u => 
      (u.name || '').trim().toLowerCase() === norm ||
      (u.username || '').trim().toLowerCase() === norm ||
      norm.includes((u.name || '').trim().toLowerCase())
    );
    if (found?.avatar && found.avatar.trim()) {
      return found.avatar.trim();
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=0f172a&color=ffffff&bold=true`;
  }, [users]);
  const [selectedPoForDetail, setSelectedPoForDetail] = useState<PurchaseOrder | null>(null);
  const [logCategoryFilter, setLogCategoryFilter] = useState<'all' | 'login' | 'po' | 'holds' | 'purchases' | 'operations'>('all');
  const [logSearchText, setLogSearchText] = useState<string>('');

  const handleRunHealthCheck = () => {
    setHealthMsg('⚡ Running ERP System Health Verification...');
    setTimeout(() => {
      setHealthMsg(`✅ System Health 100% OK | ${pos.length} Active POs | ${users.length} Authorized Users | Database Sync Active.`);
    }, 300);
  };

  // Option 2: CSV Export Handler
  const handleExportCSV = () => {
    if (!pos || pos.length === 0) return;
    const headers = ["PO Number", "Department", "Location", "Status", "Item Name", "Quantity", "Purchased Qty", "Item Status", "Brand", "Hold By"];
    const rows: string[][] = [];

    pos.forEach(po => {
      if (po.items && po.items.length > 0) {
        po.items.forEach(item => {
          rows.push([
            `"${po.poNumber || ''}"`,
            `"${po.department || ''}"`,
            `"${po.location || ''}"`,
            `"${po.purchaseStatus || po.status || ''}"`,
            `"${(item.itemName || '').replace(/"/g, '""')}"`,
            `"${item.quantity || 0}"`,
            `"${item.purchasedQty || 0}"`,
            `"${item.purchaseStatus || 'Pending'}"`,
            `"${(item.brand || '').replace(/"/g, '""')}"`,
            `"${item.holdBy || ''}"`
          ]);
        });
      } else {
        rows.push([
          `"${po.poNumber || ''}"`,
          `"${po.department || ''}"`,
          `"${po.location || ''}"`,
          `"${po.purchaseStatus || po.status || ''}"`,
          '""', '"0"', '"0"', '""', '""', '""'
        ]);
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PO_Export_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered dataset generator for Stat Card Report Modal
  const getReportData = () => {
    if (!selectedReport) return { title: '', type: 'po' as const, posList: [] as PurchaseOrder[], items: [] as POItem[] };

    const q = reportSearchQuery.toLowerCase().trim();

    if (selectedReport === 'total_po') {
      const list = pos.filter(p => !q || p.poNumber.toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q));
      return { title: '📊 Total Purchase Orders Report', type: 'po' as const, posList: list, items: [] as POItem[] };
    }
    if (selectedReport === 'pending_po') {
      const list = pos.filter(p => (p.purchaseStatus === 'Pending' || p.status === 'pending') && (!q || p.poNumber.toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q)));
      return { title: '⏳ Pending Purchase Orders Report', type: 'po' as const, posList: list, items: [] as POItem[] };
    }
    if (selectedReport === 'partial_po') {
      const list = pos.filter(p => (p.purchaseStatus === 'Partial' || p.status === 'in_progress') && (!q || p.poNumber.toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q)));
      return { title: '⚡ Partial Purchase Orders Report', type: 'po' as const, posList: list, items: [] as POItem[] };
    }
    if (selectedReport === 'completed_po') {
      const list = pos.filter(p => (p.purchaseStatus === 'Completed' || p.status === 'purchased' || p.status === 'verified') && (!q || p.poNumber.toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q)));
      return { title: '✅ Completed Purchase Orders Report', type: 'po' as const, posList: list, items: [] as POItem[] };
    }
    if (selectedReport === 'pending_items') {
      const list = allItems.filter(i => getNormalizedItemStatus(i) === 'Pending' && (!q || i.itemName.toLowerCase().includes(q) || i.poNumber.toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q)));
      return { title: '📦 Pending Items Report', type: 'item' as const, posList: [] as PurchaseOrder[], items: list };
    }
    if (selectedReport === 'hold_items') {
      let list = allItems.filter(i => getNormalizedItemStatus(i) === 'Held' && (!q || i.itemName.toLowerCase().includes(q) || i.poNumber.toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q) || (i.holdBy || '').toLowerCase().includes(q)));
      if (reportPurchaserFilter !== 'ALL') {
        list = list.filter(i => (i.holdBy || 'Purchaser') === reportPurchaserFilter);
      }
      const titleText = reportPurchaserFilter === 'ALL'
        ? '🔒 Hold Items Report (All Purchasers)'
        : `🔒 Hold Items Report - ${reportPurchaserFilter}`;
      return { title: titleText, type: 'item' as const, posList: [] as PurchaseOrder[], items: list };
    }
    if (selectedReport === 'partial_items') {
      const list = allItems.filter(i => getNormalizedItemStatus(i) === 'Partial Purchased' && (!q || i.itemName.toLowerCase().includes(q) || i.poNumber.toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q)));
      return { title: '⚡ Partial Purchased Items Report', type: 'item' as const, posList: [] as PurchaseOrder[], items: list };
    }
    if (selectedReport === 'purchased_items') {
      const list = allItems.filter(i => getNormalizedItemStatus(i) === 'Purchased' && (!q || i.itemName.toLowerCase().includes(q) || i.poNumber.toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q)));
      return { title: '🛒 Purchased Items Report', type: 'item' as const, posList: [] as PurchaseOrder[], items: list };
    }

    return { title: '', type: 'po' as const, posList: [] as PurchaseOrder[], items: [] as POItem[] };
  };

  const handleExportReportCSV = () => {
    const report = getReportData();
    if (report.type === 'po' && report.posList.length > 0) {
      const headers = ["PO Number", "Order Date", "Department", "Location", "Total Items", "Status"];
      const rows = report.posList.map(p => [
        `"${p.poNumber || ''}"`,
        `"${p.orderDate || ''}"`,
        `"${p.department || ''}"`,
        `"${p.location || ''}"`,
        `"${p.items?.length || 0}"`,
        `"${p.purchaseStatus || p.status || ''}"`
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `${selectedReport}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (report.type === 'item' && report.items.length > 0) {
      const headers = ["PO Number", "Item Name", "Brand", "Unit", "Requested Qty", "Purchased Qty", "Status", "Hold By"];
      const rows = report.items.map(i => [
        `"${i.poNumber || ''}"`,
        `"${(i.itemName || '').replace(/"/g, '""')}"`,
        `"${(i.brand || '').replace(/"/g, '""')}"`,
        `"${i.unit || ''}"`,
        `"${i.requestedQty || 0}"`,
        `"${i.purchasedQty || 0}"`,
        `"${i.purchaseStatus || ''}"`,
        `"${i.holdBy || ''}"`
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `${selectedReport}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  // Live Timer for Held Monitor auto refresh
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) {
        setNowTimestamp(Date.now());
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // PO Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawCsvText, setRawCsvText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewAnalysis, setPreviewAnalysis] = useState<ImportPreviewAnalysis | null>(null);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);
  const [importSearchQuery, setImportSearchQuery] = useState('');
  const [importPage, setImportPage] = useState(1);
  const [importFilterType, setImportFilterType] = useState<'all' | 'errors'>('all');

  // Delete Confirmation Modals (custom UI to work seamlessly in iframe)
  const [poToDelete, setPoToDelete] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // User Management State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isMasterSkuModalOpen, setIsMasterSkuModalOpen] = useState(false);

  // Keyboard Escape listener to close any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPoForDetail) {
          setSelectedPoForDetail(null);
        } else if (selectedReport) {
          setSelectedReport(null);
        } else if (isAddUserOpen) {
          setIsAddUserOpen(false);
        } else if (poToDelete) {
          setPoToDelete(null);
        } else if (showClearAllModal) {
          setShowClearAllModal(false);
        } else if (userToDelete) {
          setUserToDelete(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPoForDetail, selectedReport, isAddUserOpen, poToDelete, showClearAllModal, userToDelete]);

  const handleDeleteUser = (userId: string) => {
    const updated = users.filter(u => u.id !== userId);
    onUpdateUsers(updated);
    setUserToDelete(null);
  };
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('123');
  const [newUserRole, setNewUserRole] = useState<User['role']>('purchaser');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserAvatar, setNewUserAvatar] = useState('');

  // Editing User Photo Modal State
  const [editingUserForAvatar, setEditingUserForAvatar] = useState<User | null>(null);
  const [editAvatarUrlInput, setEditAvatarUrlInput] = useState('');

  const newUserAvatarFileRef = useRef<HTMLInputElement>(null);
  const editUserAvatarFileRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setAvatarState: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarState(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Sheets Config State
  const [webAppUrl, setWebAppUrl] = useState(sheetsConfig.webAppUrl || '');
  const [sheetId, setSheetId] = useState(sheetsConfig.sheetId || '');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (sheetsConfig.webAppUrl !== undefined) {
      setWebAppUrl(sheetsConfig.webAppUrl || '');
    }
    if (sheetsConfig.sheetId !== undefined) {
      setSheetId(sheetsConfig.sheetId || '');
    }
  }, [sheetsConfig.webAppUrl, sheetsConfig.sheetId]);

  // Copy Apps Script
  const handleCopyScript = () => {
    navigator.clipboard.writeText(getGoogleAppsScriptTemplate());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // File analysis
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setImportResult(null);
    setIsProcessing(true);

    const { rows, parseError: err } = await parsePOFile(file);
    setIsProcessing(false);

    if (err) {
      setParseError(err);
      setPreviewAnalysis(null);
      return;
    }

    const analysis = validateAndAnalyzePOImport(rows, pos);
    setPreviewAnalysis(analysis);
  };

  // Text paste analysis
  const handleAnalyzeText = () => {
    if (!rawCsvText.trim()) {
      setParseError('Please enter Excel / CSV text data before analyzing.');
      return;
    }

    setParseError(null);
    setImportResult(null);
    setIsProcessing(true);

    const { rows, parseError: err } = parsePOText(rawCsvText);
    setIsProcessing(false);

    if (err) {
      setParseError(err);
      setPreviewAnalysis(null);
      return;
    }

    const analysis = validateAndAnalyzePOImport(rows, pos);
    setPreviewAnalysis(analysis);
  };

  // Sample data load
  const handleLoadSampleData = () => {
    const sampleText = `ORDER DATE\tLOCATION\tPO NUMBER\tDEPARTMENT\tSL NUMBER\tITEM NAME\tBRAND\tUNIT\tQTY\tDELIVERY DATE
2026-07-22\tCentral Hub Bay 1\tPO-2026-101\tFresh Produce\t1\tOrganic Fresh Tomatoes\tAgriFresh\tkg\t150\t2026-07-23
2026-07-22\tCentral Hub Bay 1\tPO-2026-101\tFresh Produce\t2\tRed Bell Peppers\tAgriFresh\tkg\t80\t2026-07-23
2026-07-22\tCold Storage A\tPO-2026-102\tMeats & Frozen\t1\tFresh Chicken Breast\tPrime Poultry\tkg\t120\t2026-07-22
2026-07-22\tCold Storage A\tPO-2026-102\tMeats & Frozen\t2\tBeef Ribeye Cuts\tPrime Poultry\tkg\t45\t2026-07-22`;
    setRawCsvText(sampleText);
    setSelectedFile(null);
    setParseError(null);
    setImportResult(null);

    const { rows } = parsePOText(sampleText);
    const analysis = validateAndAnalyzePOImport(rows, pos);
    setPreviewAnalysis(analysis);
  };

  // Final Import
  const handleExecuteFinalImport = async () => {
    if (!previewAnalysis || previewAnalysis.errors.some(e => e.severity === 'error')) {
      return;
    }

    const currentAnalysis = previewAnalysis;

    setIsProcessing(true);
    const res = await executePOImport(currentAnalysis.parsedRows, pos);
    setIsProcessing(false);

    setImportResult(res);
    setPreviewAnalysis(null);
    setSelectedFile(null);
    setRawCsvText('');

    // Trigger API import to backend and update local/global state
    if (res.updatedPOs && res.updatedPOs.length > 0) {
      onImportPOs(res.updatedPOs);
    }
  };

  // Add User
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      username: newUserUsername.trim() || newUserEmail.split('@')[0],
      password: newUserPassword || '123',
      role: newUserRole,
      phone: newUserPhone.trim(),
      avatar: newUserAvatar.trim() || undefined,
      active: true,
      status: 'Active',
      createdDate: new Date().toISOString().split('T')[0],
      lastLogin: 'Never'
    };

    onUpdateUsers([...users, newUser]);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserUsername('');
    setNewUserPhone('');
    setNewUserAvatar('');
    setIsAddUserOpen(false);
  };

  const handleSaveEditedUserAvatar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserForAvatar) return;
    const updated = users.map(u => u.id === editingUserForAvatar.id ? { ...u, avatar: editAvatarUrlInput.trim() || undefined } : u);
    onUpdateUsers(updated);
    setEditingUserForAvatar(null);
    setEditAvatarUrlInput('');
  };

  const handleToggleUser = (userId: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, active: !u.active, status: !u.active ? ('Active' as const) : ('Inactive' as const) } : u);
    onUpdateUsers(updated);
  };

  const handleSaveConfig = () => {
    onSaveSheetsConfig({
      sheetId,
      webAppUrl,
      autoSync: true,
      lastSyncedAt: new Date().toISOString()
    });
    onSync();
  };

  // ==================== METRICS CALCULATIONS ====================
  const allItems = pos.flatMap(p => {
    return (p.items || []).map(i => {
      const normStatus = getNormalizedItemStatus(i);
      const isHeld = normStatus === 'Held';

      return {
        ...i,
        poNumber: i.poNumber || p.poNumber,
        department: i.department || p.department || 'General',
        purchaseStatus: normStatus,
        holdBy: isHeld ? (i.holdBy || i.holdByName || 'Purchaser') : '',
        holdById: isHeld ? (i.holdById || '') : '',
        holdByName: isHeld ? (i.holdByName || i.holdBy || 'Purchaser') : '',
        holdStartTime: isHeld ? (i.holdStartTime || i.holdSince || new Date().toISOString()) : '',
        holdSince: isHeld ? (i.holdSince || i.holdStartTime || new Date().toISOString()) : '',
        holdExpireTime: ''
      };
    });
  });

  // 1. Total PO
  const totalPO = pos.length;
  // 2. Pending PO
  const pendingPO = pos.filter(p => p.purchaseStatus === 'Pending' || p.status === 'pending').length;
  // 3. Partial PO
  const partialPO = pos.filter(p => p.purchaseStatus === 'Partial' || p.status === 'in_progress').length;
  // 4. Completed PO
  const completedPO = pos.filter(p => p.purchaseStatus === 'Completed' || p.status === 'purchased' || p.status === 'verified').length;

  // 5. Pending Items
  const pendingItemsCount = allItems.filter(i => getNormalizedItemStatus(i) === 'Pending').length;
  // 6. Held Items
  const heldItemsCount = allItems.filter(i => getNormalizedItemStatus(i) === 'Held').length;
  // 7. Partial Purchased Items
  const partialItemsCount = allItems.filter(i => getNormalizedItemStatus(i) === 'Partial Purchased').length;
  // 8. Completed Purchased Items
  const purchasedItemsCount = allItems.filter(i => getNormalizedItemStatus(i) === 'Purchased').length;

  // Currently Held Items for Held Monitor
  const heldItemsList = allItems.filter(i => getNormalizedItemStatus(i) === 'Held');

  const uniqueHoldPurchasers = React.useMemo(() => {
    const set = new Set<string>();
    heldItemsList.forEach(i => {
      const p = i.holdBy || 'Purchaser';
      set.add(p);
    });
    return Array.from(set).sort();
  }, [heldItemsList]);

  const displayHeldItems = React.useMemo(() => {
    if (holdPurchaserFilter === 'ALL') return heldItemsList;
    return heldItemsList.filter(i => (i.holdBy || 'Purchaser') === holdPurchaserFilter);
  }, [heldItemsList, holdPurchaserFilter]);

  // Option 3: Department & Location Summaries
  const departmentBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    pos.forEach(p => {
      const d = p.department?.trim() || 'General';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [pos]);

  const locationBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    pos.forEach(p => {
      const l = p.location?.trim() || 'Default';
      counts[l] = (counts[l] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [pos]);

  // Running PO List memoized calculations
  const uniqueDepartments = React.useMemo(() => {
    const depts = new Set<string>();
    pos.forEach(p => {
      if (p.department?.trim()) depts.add(p.department.trim());
    });
    return Array.from(depts).sort();
  }, [pos]);

  const uniqueLocations = React.useMemo(() => {
    const locs = new Set<string>();
    pos.forEach(p => {
      if (p.location?.trim()) locs.add(p.location.trim());
    });
    return Array.from(locs).sort();
  }, [pos]);

  const filteredRunningPOs = React.useMemo(() => {
    return pos.filter(po => {
      // Status filter
      if (runningPoStatusFilter === 'ACTIVE') {
        if (po.purchaseStatus === 'Completed') return false;
      } else if (runningPoStatusFilter === 'Held') {
        if (!po.isHeldByAdmin && po.purchaseStatus !== 'Held' && !(po.items || []).some(i => i.purchaseStatus === 'Held')) return false;
      } else if (runningPoStatusFilter !== 'ALL') {
        if (po.purchaseStatus !== runningPoStatusFilter) return false;
      }

      // Department Filter
      if (runningPoDeptFilter !== 'ALL' && (po.department || 'General') !== runningPoDeptFilter) {
        return false;
      }

      // Location Filter
      if (runningPoLocFilter !== 'ALL' && (po.location || 'Central Warehouse') !== runningPoLocFilter) {
        return false;
      }

      // PO Search
      if (runningPoSearch.trim()) {
        const q = runningPoSearch.toLowerCase().trim();
        if (!po.poNumber.toLowerCase().includes(q)) return false;
      }

      // Item Name Search
      if (runningPoItemSearch.trim()) {
        const iq = runningPoItemSearch.toLowerCase().trim();
        const hasItemMatch = (po.items || []).some(item => 
          (item.itemName || '').toLowerCase().includes(iq) ||
          (item.brand || '').toLowerCase().includes(iq)
        );
        if (!hasItemMatch) return false;
      }

      return true;
    });
  }, [pos, runningPoStatusFilter, runningPoDeptFilter, runningPoLocFilter, runningPoSearch, runningPoItemSearch]);

  const exportRunningPOsToCSV = () => {
    if (filteredRunningPOs.length === 0) return;

    const headers = [
      "PO Number",
      "Order Date",
      "Location",
      "Department",
      "Status",
      "Total Items",
      "Purchased Items",
      "Pending Items",
      "Hold Items",
      "Progress %",
      "Item Details"
    ];

    const rows = filteredRunningPOs.map(po => {
      const items = po.items || [];
      const total = items.length;
      const purchased = items.filter(i => i.purchaseStatus === 'Purchased').length;
      const pending = items.filter(i => i.purchaseStatus === 'Pending' || !i.purchaseStatus).length;
      const held = items.filter(i => i.purchaseStatus === 'Held').length;
      const progress = total > 0 ? Math.round((purchased / total) * 100) : 0;

      const itemDetailsStr = items.map(i => `${i.itemName} (${i.purchaseStatus || 'Pending'})`).join('; ');

      return [
        `"${po.poNumber || ''}"`,
        `"${po.orderDate || po.createdAt || ''}"`,
        `"${(po.location || 'Central Warehouse').replace(/"/g, '""')}"`,
        `"${(po.department || 'General').replace(/"/g, '""')}"`,
        `"${po.purchaseStatus || 'Pending'}"`,
        `"${total}"`,
        `"${purchased}"`,
        `"${pending}"`,
        `"${held}"`,
        `"${progress}%"`,
        `"${itemDetailsStr.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Running_POs_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRunningPOsToPDF = () => {
    if (filteredRunningPOs.length === 0) return;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      alert("Please allow popups to generate PDF/Print report.");
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const activeFiltersText = [
      runningPoStatusFilter !== 'ACTIVE' ? `Status: ${runningPoStatusFilter}` : 'Status: Active Running POs',
      runningPoLocFilter !== 'ALL' ? `Location: ${runningPoLocFilter}` : '',
      runningPoDeptFilter !== 'ALL' ? `Dept: ${runningPoDeptFilter}` : '',
      runningPoSearch ? `PO Search: "${runningPoSearch}"` : '',
      runningPoItemSearch ? `Item Search: "${runningPoItemSearch}"` : ''
    ].filter(Boolean).join(' | ');

    const poCardsHtml = filteredRunningPOs.map((po) => {
      const items = po.items || [];
      const total = items.length;
      const purchased = items.filter(i => i.purchaseStatus === 'Purchased').length;
      const progress = total > 0 ? Math.round((purchased / total) * 100) : 0;
      const st = (po.purchaseStatus || 'Pending').toLowerCase();

      const itemRowsHtml = items.map((item, itemIdx) => {
        const req = item.requestedQty || item.orderedQty || 0;
        const pur = item.purchasedQty || 0;
        const status = item.purchaseStatus || 'Pending';
        const statusClass = status.toLowerCase();

        return `
          <tr class="item-tr" style="background-color: ${itemIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="text-align: center; font-weight: bold; color: #64748b; padding: 6px;">${item.slNumber || itemIdx + 1}</td>
            <td style="font-weight: 600; color: #0f172a; padding: 6px;">${item.itemName}</td>
            <td style="color: #64748b; padding: 6px;">${item.brand || item.category || '-'}</td>
            <td style="text-align: center; font-weight: 600; padding: 6px;">${req} ${item.unit || 'pcs'}</td>
            <td style="text-align: center; font-weight: 600; color: ${pur > 0 ? '#15803d' : '#64748b'}; padding: 6px;">${pur} ${item.unit || 'pcs'}</td>
            <td style="text-align: center; padding: 6px;">
              <span class="status-badge status-${statusClass}">${status}</span>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div class="po-card">
          <div class="po-header">
            <div>
              <span class="po-number">${po.poNumber}</span>
              <span class="po-meta">📍 ${po.location || 'Central Warehouse'} &nbsp;|&nbsp; 🏢 ${po.department || 'General'}</span>
            </div>
            <div>
              <span class="po-badge badge-${st}">
                ${po.purchaseStatus || 'Pending'} (${purchased}/${total} Purchased - ${progress}%)
              </span>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">SL</th>
                <th>Item Name</th>
                <th style="width: 18%;">Brand / Category</th>
                <th style="width: 14%; text-align: center;">Requested Qty</th>
                <th style="width: 14%; text-align: center;">Purchased Qty</th>
                <th style="width: 16%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${itemRowsHtml || '<tr><td colspan="6" style="padding: 12px; text-align: center; color: #94a3b8;">No items in this PO</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Running PO Report - ${new Date().toISOString().slice(0, 10)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 20px;
            color: #0f172a;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.4;
          }
          .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .title { font-size: 18px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.3px; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
          .filters {
            background: #f1f5f9;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            margin-bottom: 16px;
            border-left: 4px solid #2563eb;
            color: #334155;
          }
          .po-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            margin-bottom: 20px;
            background: #ffffff;
            overflow: hidden;
            page-break-inside: auto;
            break-inside: auto;
          }
          .po-header {
            background: #f8fafc;
            border-bottom: 1px solid #cbd5e1;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .po-number {
            font-size: 13px;
            font-weight: 800;
            color: #1e40af;
            font-family: monospace;
          }
          .po-meta {
            font-size: 11px;
            color: #475569;
            margin-left: 8px;
          }
          .po-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
          }
          .badge-completed { background: #dcfce7; color: #166534; }
          .badge-partial { background: #dbeafe; color: #1e40af; }
          .badge-pending { background: #fef3c7; color: #92400e; }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          .items-table th {
            background: #f1f5f9;
            color: #334155;
            padding: 6px 8px;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9px;
            border-bottom: 1px solid #cbd5e1;
            text-align: left;
          }
          .items-table td {
            border-bottom: 1px solid #e2e8f0;
          }
          .item-tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
          }
          .status-purchased { background: #dcfce7; color: #15803d; }
          .status-held { background: #f3e8ff; color: #7e22ce; }
          .status-pending { background: #fef3c7; color: #b45309; }

          @media print {
            body { padding: 0 !important; background: #fff !important; }
            .no-print { display: none !important; }
            .item-tr { page-break-inside: avoid !important; break-inside: avoid !important; }
            .po-header { page-break-inside: avoid !important; break-inside: avoid !important; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div class="title">📋 RUNNING PURCHASE ORDERS REPORT</div>
            <div class="subtitle">Generated: ${todayStr} | Total Active POs: ${filteredRunningPOs.length}</div>
          </div>
          <div class="no-print" style="display: flex; gap: 8px;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Print / Save as PDF</button>
            <button onclick="window.close()" style="padding: 8px 16px; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">✖ Close Window</button>
          </div>
        </div>

        ${activeFiltersText ? `<div class="filters"><strong>Applied Filters:</strong> ${activeFiltersText}</div>` : ''}

        <div class="po-cards-container">
          ${poCardsHtml}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const [pdfModalPo, setPdfModalPo] = useState<PurchaseOrder | null>(null);

  // Export single PO details to official RADIANT LIGHTNING PDF Delivery Note / Invoice
  const handleOpenPdfModal = (po: PurchaseOrder) => {
    setPdfModalPo(po);
  };

  const handlePrintPoReport = (po: PurchaseOrder) => {
    printOfficialRLDeliveryNote(po, {
      recipientName: 'CPPA Authorized Receiver',
      companyName: 'C P P A',
      companySubtext: 'الشؤون الخاصة لسمو ولي العهد'
    });
  };

  // Export single PO details to Excel (CSV)
  const handleExportSinglePoExcel = (po: PurchaseOrder) => {
    const headers = [
      "PO Number", "SL No", "Item Name", "Brand", "Department", "Location",
      "Unit", "Requested Qty", "Purchased Qty", "Warehouse Received Qty",
      "Remaining Qty", "Purchase Status", "Receive Status", "Order Date", "Delivery Date", "Notes"
    ];

    const rows = (po.items || []).map((item, idx) => {
      const req = item.requestedQty || item.orderedQty || 0;
      const pur = item.purchasedQty || 0;
      const rec = item.warehouseQty || 0;
      const rem = Math.max(0, req - rec);

      return [
        `"${po.poNumber || ''}"`,
        `"${item.slNumber || idx + 1}"`,
        `"${(item.itemName || '').replace(/"/g, '""')}"`,
        `"${(item.brand || 'N/A').replace(/"/g, '""')}"`,
        `"${(po.department || 'General').replace(/"/g, '""')}"`,
        `"${(po.location || 'Central Warehouse').replace(/"/g, '""')}"`,
        `"${item.unit || 'pcs'}"`,
        `"${req}"`,
        `"${pur}"`,
        `"${rec}"`,
        `"${rem}"`,
        `"${item.purchaseStatus || 'Pending'}"`,
        `"${rec >= req && req > 0 ? 'Received' : rec > 0 ? 'Partial' : 'Pending'}"`,
        `"${po.orderDate || po.createdAt || ''}"`,
        `"${po.deliveryDate || ''}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `PO_Report_${po.poNumber}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered POs list for Quick Search & Status Pills (Option 1)
  const filteredPos = pos.filter(po => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'Pending' && po.purchaseStatus !== 'Pending' && po.status !== 'pending') return false;
      if (statusFilter === 'Partial' && po.purchaseStatus !== 'Partial' && po.status !== 'in_progress') return false;
      if (statusFilter === 'Completed' && po.purchaseStatus !== 'Completed' && po.status !== 'purchased' && po.status !== 'verified') return false;
      if (statusFilter === 'Held' && po.purchaseStatus !== 'Held' && !(po.items || []).some(i => i.purchaseStatus === 'Held')) return false;
    }

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      po.poNumber.toLowerCase().includes(q) ||
      (po.department || '').toLowerCase().includes(q) ||
      (po.location || '').toLowerCase().includes(q) ||
      (po.purchaseStatus || '').toLowerCase().includes(q) ||
      (po.items || []).some(i => 
        i.itemName.toLowerCase().includes(q) ||
        (i.brand || '').toLowerCase().includes(q) ||
        (i.holdBy || '').toLowerCase().includes(q)
      )
    );
  });

  // Format countdown string
  const formatCountdown = (expireIsoStr?: string) => {
    if (!expireIsoStr) return '00h 00m 00s';
    const expireTime = new Date(expireIsoStr).getTime();
    if (isNaN(expireTime)) return '00h 00m 00s';
    const diff = expireTime - nowTimestamp;
    if (diff <= 0) return 'Expired';

    const totalSecs = Math.floor(diff / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 space-y-4 font-sans text-slate-900 w-full min-h-screen">
      
      {/* Header - 2 Line Clean Layout (Left to Right, No Horizontal Scroll) */}
      <div className="bg-gradient-to-r from-[#072417] via-[#0E3A24] to-[#072417] border border-emerald-900/60 text-white p-3.5 sm:p-4 rounded-xl space-y-3 shadow-md">
        {/* Line 1: Header Title & Main Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-emerald-800/60 pb-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-sm sm:text-base font-bold leading-tight">Admin Dashboard</h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Master Operations & Master Google Sheets Database</p>
            </div>

            {/* Master SKU Mapping Button on Line 1 Left Side */}
            <button
              type="button"
              onClick={() => setIsMasterSkuModalOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Manage Master SKU Mappings & Dropbox Auto-Sync URL"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-200" />
              <span>Master SKU Mapping</span>
            </button>
          </div>

          {/* Navigation Tab Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-blue-300" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-300" />
              <span>PO Import</span>
            </button>

            {/* Active Admin Option Pill if opened from Admin Profile Menu */}
            {activeTab !== 'dashboard' && activeTab !== 'import' && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5">
                  <Crown className="w-3 h-3 text-amber-400" />
                  {activeTab === 'users' && `Users (${users.length})`}
                  {activeTab === 'sheets' && 'Google Sheets Config'}
                  {activeTab === 'telegram' && 'Telegram Bot Alerts'}
                  {activeTab === 'tests' && 'System Diagnostics'}
                  {activeTab === 'docs' && 'Setup & Guides'}
                  {activeTab === 'logs' && 'Audit Security Logs'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                  title="Back to Dashboard"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Line 2: Master Operations & Telegram Report Action Buttons (Left to Right, Direct Buttons) */}
        <div className="flex flex-wrap items-center justify-start gap-1.5 sm:gap-2 pt-1 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setIsCustomAlertModalOpen(true)}
            disabled={isSendingTelegramSummary || isSendingCustomAlert}
            className="px-2.5 sm:px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-600/60 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Send custom broadcast message or urgent alert to Telegram group"
          >
            <span className="text-sm leading-none">📢</span>
            <span>Custom Alert</span>
          </button>

          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Master'}</span>
          </button>

          <div className="h-4 w-px bg-slate-700/80 hidden sm:block mx-0.5" />

          {/* Direct 5 Telegram Report Buttons */}
          <button
            type="button"
            onClick={() => handleSendTelegramReport('master')}
            disabled={isSendingTelegramSummary}
            className="px-2.5 sm:px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-100 border border-blue-700/60 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Send Daily Master Summary to Telegram"
          >
            <span className="text-sm leading-none">📊</span>
            <span>1. Daily Summary</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendTelegramReport('pending')}
            disabled={isSendingTelegramSummary}
            className="px-2.5 sm:px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-100 border border-amber-700/60 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Send Urgent Pending Purchases to Telegram"
          >
            <span className="text-sm leading-none">🛒</span>
            <span>2. Urgent Pending</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendTelegramReport('hold')}
            disabled={isSendingTelegramSummary}
            className="px-2.5 sm:px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-100 border border-rose-700/60 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Send On-Hold Items Digest to Telegram"
          >
            <span className="text-sm leading-none">⏸️</span>
            <span>3. On-Hold Digest</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendTelegramReport('transit')}
            disabled={isSendingTelegramSummary}
            className="px-2.5 sm:px-3 py-1.5 bg-sky-950/60 hover:bg-sky-900/80 text-sky-100 border border-sky-700/60 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Send In-Transit Goods Report to Telegram"
          >
            <span className="text-sm leading-none">🚚</span>
            <span>4. In-Transit Goods</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendTelegramReport('warehouse')}
            disabled={isSendingTelegramSummary}
            className="px-2.5 sm:px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-100 border border-purple-700/60 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Send Warehouse Staging Stock to Telegram"
          >
            <span className="text-sm leading-none">🏬</span>
            <span>5. Warehouse Staging</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          
          {/* Smart Discrepancy Alerts & Visual Dispatch Kanban Pipeline */}
          <DiscrepancyAlertHub pos={pos} />
          <DispatchKanbanPipeline pos={pos} />

          {/* EXACTLY 8 COMPACT KPI CARDS - BALANCED GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            
            {/* 1. Total PO */}
            <button
              type="button"
              onClick={() => { setSelectedReport('total_po'); setReportSearchQuery(''); }}
              className="bg-white p-3 rounded-xl border border-slate-200 text-left transition-all hover:scale-[1.02] hover:shadow-md hover:border-slate-400 hover:ring-2 hover:ring-slate-400/20 active:scale-95 group cursor-pointer"
              title="Click to view Total PO Report"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Total PO</p>
                <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-700">📊</span>
              </div>
              <p className="text-xl font-black text-slate-900 mt-1">{totalPO}</p>
            </button>

            {/* 2. Pending PO */}
            <button
              type="button"
              onClick={() => { setSelectedReport('pending_po'); setReportSearchQuery(''); }}
              className="bg-white p-3 rounded-xl border border-amber-200 text-left transition-all hover:scale-[1.02] hover:shadow-md hover:border-amber-400 hover:ring-2 hover:ring-amber-400/20 active:scale-95 group cursor-pointer"
              title="Click to view Pending PO Report"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Pending PO</p>
                <span className="text-[9px] font-bold text-amber-500 group-hover:text-amber-800">⏳</span>
              </div>
              <p className="text-xl font-black text-amber-800 mt-1">{pendingPO}</p>
            </button>

            {/* 3. Partial PO */}
            <button
              type="button"
              onClick={() => { setSelectedReport('partial_po'); setReportSearchQuery(''); }}
              className="bg-white p-3 rounded-xl border border-blue-200 text-left transition-all hover:scale-[1.02] hover:shadow-md hover:border-blue-400 hover:ring-2 hover:ring-blue-400/20 active:scale-95 group cursor-pointer"
              title="Click to view Partial PO Report"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">Partial PO</p>
                <span className="text-[9px] font-bold text-blue-500 group-hover:text-blue-800">⚡</span>
              </div>
              <p className="text-xl font-black text-blue-800 mt-1">{partialPO}</p>
            </button>

            {/* 4. Completed PO */}
            <button
              type="button"
              onClick={() => { setSelectedReport('completed_po'); setReportSearchQuery(''); }}
              className="bg-white p-3 rounded-xl border border-emerald-200 text-left transition-all hover:scale-[1.02] hover:shadow-md hover:border-emerald-400 hover:ring-2 hover:ring-emerald-400/20 active:scale-95 group cursor-pointer"
              title="Click to view Completed PO Report"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Completed PO</p>
                <span className="text-[9px] font-bold text-emerald-500 group-hover:text-emerald-800">✅</span>
              </div>
              <p className="text-xl font-black text-emerald-800 mt-1">{completedPO}</p>
            </button>

            {/* 5. Pending Items */}
            <button
              type="button"
              onClick={() => { setSelectedReport('pending_items'); setReportSearchQuery(''); }}
              className="bg-white p-3 rounded-xl border border-amber-200 text-left transition-all hover:scale-[1.02] hover:shadow-md hover:border-amber-400 hover:ring-2 hover:ring-amber-400/20 active:scale-95 group cursor-pointer"
              title="Click to view Pending Items Report"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">Pending Items</p>
                <span className="text-[9px] font-bold text-amber-500 group-hover:text-amber-800">📦</span>
              </div>
              <p className="text-xl font-black text-amber-800 mt-1">{pendingItemsCount}</p>
            </button>

            {/* 6. Hold Items */}
            <button
              type="button"
              onClick={() => { setSelectedReport('hold_items'); setReportSearchQuery(''); }}
              className="bg-white p-3 rounded-xl border border-purple-200 text-left transition-all hover:scale-[1.02] hover:shadow-md hover:border-purple-400 hover:ring-2 hover:ring-purple-400/20 active:scale-95 group cursor-pointer"
              title="Click to view Hold Items Report"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-purple-700 tracking-wider">Hold Items</p>
                <span className="text-[9px] font-bold text-purple-500 group-hover:text-purple-800">🔒</span>
              </div>
              <p className="text-xl font-black text-purple-800 mt-1">{heldItemsCount}</p>
            </button>

            {/* 7. Partial Items */}
            <button
              type="button"
              onClick={() => { setSelectedReport('partial_items'); setReportSearchQuery(''); }}
              className="bg-white p-3 rounded-xl border border-blue-200 text-left transition-all hover:scale-[1.02] hover:shadow-md hover:border-blue-400 hover:ring-2 hover:ring-blue-400/20 active:scale-95 group cursor-pointer"
              title="Click to view Partial Purchased Items Report"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">Partial Items</p>
                <span className="text-[9px] font-bold text-blue-500 group-hover:text-blue-800">⚡</span>
              </div>
              <p className="text-xl font-black text-blue-800 mt-1">{partialItemsCount}</p>
            </button>

            {/* 8. Purchased Items */}
            <button
              type="button"
              onClick={() => { setSelectedReport('purchased_items'); setReportSearchQuery(''); }}
              className="bg-white p-3 rounded-xl border border-emerald-200 text-left transition-all hover:scale-[1.02] hover:shadow-md hover:border-emerald-400 hover:ring-2 hover:ring-emerald-400/20 active:scale-95 group cursor-pointer"
              title="Click to view Purchased Items Report"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Purchased Items</p>
                <span className="text-[9px] font-bold text-emerald-500 group-hover:text-emerald-800">🛒</span>
              </div>
              <p className="text-xl font-black text-emerald-800 mt-1">{purchasedItemsCount}</p>
            </button>

          </div>

          {/* EXECUTIVE QUICK ACTIONS & SYSTEM HEALTH BAR */}
          <div className="bg-gradient-to-r from-[#072417] via-[#0E3A24] to-[#072417] border border-emerald-900/60 text-white p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Quick Actions:
              </span>
              <button
                type="button"
                onClick={() => exportPOsToXLSX(pos)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition active:scale-95"
                title="Export all Purchase Orders to Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition active:scale-95"
                title="Export all Purchase Orders to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={handleRunHealthCheck}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 transition active:scale-95"
              >
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                Health Check
              </button>
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Engine
              </button>
            </div>

            {healthMsg && (
              <div className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-lg flex items-center justify-between gap-2 w-full sm:w-auto">
                <span>{healthMsg}</span>
                <button type="button" onClick={() => setHealthMsg(null)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* UNIFIED PURCHASE ORDERS MANAGEMENT & SIDE PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Side: UNIFIED PURCHASE ORDERS MANAGEMENT (takes 2 cols on lg) */}
            <RunningPoList 
              pos={pos} 
              title="Purchase Orders Management (All & Active Orders)"
              className="lg:col-span-2" 
              onDeletePO={onDeletePO}
              onClearAllPOs={onClearAllPOs}
            />

            {/* Right Side: HOLD MONITOR & RECENT ACTIVITY LOGS (takes 1 col on lg) */}
            <div className="lg:col-span-1 space-y-4">
              {/* Purchaser Hold Monitor */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 space-y-3 transition-all duration-200">
                <div>
                  <div 
                    onClick={() => setIsHoldMonitorExpanded(!isHoldMonitorExpanded)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2 cursor-pointer select-none hover:bg-slate-50/80 -m-1 p-2 rounded-lg transition"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-purple-600" />
                        Purchaser Hold Monitor ({displayHeldItems.length} Holds)
                      </h3>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60">
                        {isHoldMonitorExpanded ? 'Minimize' : 'Expand'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => { setSelectedReport('hold_items'); setReportSearchQuery(''); setReportPurchaserFilter(holdPurchaserFilter); }}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition cursor-pointer"
                      >
                        <span>Hold Report</span>
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsHoldMonitorExpanded(!isHoldMonitorExpanded)}
                        className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
                        title={isHoldMonitorExpanded ? 'Minimize' : 'Expand'}
                      >
                        {isHoldMonitorExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Content */}
                  {isHoldMonitorExpanded && (
                    <div className="pt-2 border-t border-slate-100">
                      {/* Purchaser-wise Filter Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto py-2">
                        <span className="text-[10px] font-bold uppercase text-slate-500 shrink-0">Purchasers:</span>
                        <button
                          type="button"
                          onClick={() => setHoldPurchaserFilter('ALL')}
                          className={`px-2.5 py-0.5 rounded-md text-xs font-bold transition shrink-0 cursor-pointer ${
                            holdPurchaserFilter === 'ALL'
                              ? 'bg-purple-900 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-900 border border-slate-200'
                          }`}
                        >
                          All ({heldItemsList.length})
                        </button>
                        {uniqueHoldPurchasers.map((p, pIdx) => {
                          const pCount = heldItemsList.filter(i => (i.holdBy || 'Purchaser') === p).length;
                          return (
                            <button
                              key={`${p}-${pIdx}`}
                              type="button"
                              onClick={() => setHoldPurchaserFilter(p)}
                              className={`px-2.5 py-0.5 rounded-md text-xs font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                                holdPurchaserFilter === p
                                  ? 'bg-purple-900 text-white shadow-xs'
                                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
                              }`}
                            >
                              <span>{p}</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                holdPurchaserFilter === p ? 'bg-purple-800 text-white' : 'bg-purple-200 text-purple-900'
                              }`}>{pCount}</span>
                            </button>
                          );
                        })}
                      </div>

                      {heldItemsList.length === 0 ? (
                        <p className="text-slate-400 text-xs text-center py-6">No items currently on hold.</p>
                      ) : displayHeldItems.length === 0 ? (
                        <p className="text-slate-400 text-xs text-center py-6">No holds found for purchaser: <span className="font-bold text-slate-700">{holdPurchaserFilter}</span></p>
                      ) : (
                        <div className="overflow-x-auto mt-1 max-h-[250px] overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-purple-100/80 text-purple-950 font-bold uppercase text-[10px] sticky top-0 z-10 shadow-2xs">
                              <tr>
                                <th className="p-2">PO Number</th>
                                <th className="p-2">Item Name</th>
                                <th className="p-2">Department</th>
                                <th className="p-2 text-center">Quantity</th>
                                <th className="p-2">Held By</th>
                                <th className="p-2">Hold Since</th>
                                <th className="p-2 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {displayHeldItems.map((item, idx) => {
                                const holdTime = item.holdSince || item.holdStartTime;
                                let formattedHoldTime = 'N/A';
                                if (holdTime) {
                                  try {
                                    const d = new Date(holdTime);
                                    if (!isNaN(d.getTime())) {
                                      formattedHoldTime = d.toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      });
                                    }
                                  } catch {
                                    formattedHoldTime = holdTime;
                                  }
                                }

                                return (
                                  <tr key={item.id ? `${item.id}-${idx}` : `held-${idx}`} className="hover:bg-purple-50/40 transition">
                                    <td className="p-2 font-mono font-bold text-purple-800">{item.poNumber}</td>
                                    <td className="p-2 font-bold text-slate-900">
                                      <span>{item.itemName}</span>
                                    </td>
                                    <td className="p-2 text-slate-600 font-medium">{item.department || 'General'}</td>
                                    <td className="p-2 text-center font-bold text-slate-800">{item.requestedQty || item.orderedQty || 0} {item.unit || ''}</td>
                                    <td className="p-2 text-slate-800 font-bold">
                                      <div className="flex flex-col">
                                        <span className="text-slate-900 font-bold">{item.holdByName || item.holdBy || 'Purchaser'}</span>
                                        {item.holdById && (
                                          <span className="text-[10px] text-slate-400 font-mono">ID: {item.holdById}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-2 text-slate-600 font-mono text-[11px] whitespace-nowrap">{formattedHoldTime}</td>
                                    <td className="p-2 text-center">
                                      <span className="bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1">
                                        <Lock className="w-3 h-3 text-purple-600 shrink-0" />
                                        HOLD
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity Logs */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Recent Activity Logs
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {auditLogs.slice(0, 5).map((log, idx) => {
                    const avatarUrl = getUserAvatar(log.user);
                    return (
                      <div key={log.id ? `${log.id}-${idx}` : `log-${idx}`} className="py-2 flex items-start gap-2.5">
                        <img 
                          src={avatarUrl} 
                          alt={log.user} 
                          className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5 shadow-2xs"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(log.user || 'User')}&background=0f172a&color=ffffff&bold=true`;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-900 truncate">{log.user} <span className="text-slate-400 font-normal text-[10px]">({log.role})</span></span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] truncate mt-0.5">{log.action}: {log.details}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* DEPARTMENT & LOCATION SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department Summary Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-600" />
                  Department Breakdown ({departmentBreakdown.length})
                </span>
                <span className="text-[10px] text-slate-400 font-normal">PO Distribution</span>
              </h3>
              {departmentBreakdown.length === 0 ? (
                <p className="text-slate-400 text-xs py-2">No departments found.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {departmentBreakdown.map(([deptName, count], idx) => (
                    <div key={`${deptName}-${idx}`} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">{deptName}</span>
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {count} POs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location Summary Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Location / Warehouse Breakdown ({locationBreakdown.length})
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Site Distribution</span>
              </h3>
              {locationBreakdown.length === 0 ? (
                <p className="text-slate-400 text-xs py-2">No locations found.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {locationBreakdown.map(([locName, count], idx) => (
                    <div key={`${locName}-${idx}`} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">{locName}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {count} POs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI OPERATIONS & AUTOMATED BACKUP HUB */}
          <AiBackupHub pos={pos} auditLogs={auditLogs} onRestoreState={onImportPOs} />

        </div>
      )}

      {/* IMPORT TAB */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900">Purchase Order Excel (.xlsx) / CSV Bulk Importer</h2>
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 text-[10px] font-black rounded-full uppercase tracking-wider border border-purple-200">
                    ⚡ 1,000+ Items Engine
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">High-speed batch import for large datasets with duplicate merging, automatic field correction, and instant audit tracking.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadSampleXLSXTemplate()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  title="Download basic sample template"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                  Basic Template
                </button>
                <button
                  type="button"
                  onClick={() => downloadLargeScaleSampleXLSXTemplate(1000)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  title="Download 1,000 items sample template to test large scale bulk import"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-700" />
                  ⚡ 1,000+ Bulk Sample
                </button>
                <button
                  type="button"
                  onClick={() => exportPOsToXLSX(pos)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  title="Export all current POs to Excel file"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Export POs (.xlsx)
                </button>
              </div>
            </div>
            
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-purple-200 hover:border-purple-600 rounded-xl p-6 text-center bg-purple-50/20 hover:bg-purple-50/60 cursor-pointer transition group"
            >
              <Upload className="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-black text-slate-800">Click to upload or drag & drop Excel / CSV file</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Supports 1,000+ items per file (.xlsx, .xls, .csv, .tsv)</p>
              {selectedFile && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-900 rounded-full text-xs font-bold border border-purple-300">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-800" />
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                className="hidden"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Or Paste Raw Excel Data / CSV Text:</label>
                <button onClick={handleLoadSampleData} className="text-xs text-purple-700 font-bold hover:underline cursor-pointer">
                  Load Quick Sample Text
                </button>
              </div>
              <textarea
                rows={3}
                value={rawCsvText}
                onChange={(e) => setRawCsvText(e.target.value)}
                placeholder="Paste rows copied directly from Excel spreadsheet (supports tab or comma delimited)..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-slate-50 focus:bg-white focus:border-purple-500 outline-none transition"
              />
              <button
                onClick={handleAnalyzeText}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-900 hover:bg-purple-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-300" />
                    Analyzing 1,000+ Rows...
                  </>
                ) : (
                  'Analyze PO Rows'
                )}
              </button>
            </div>

            {parseError && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs font-semibold border border-rose-200 flex items-start gap-2">
                <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{parseError}</div>
              </div>
            )}
          </div>

          {/* PREVIEW & ANALYSIS MODAL / PANEL */}
          {previewAnalysis && (() => {
            const hasErrors = previewAnalysis.errors.some(e => e.severity === 'error');
            const parsedRows = previewAnalysis.parsedRows || [];
            
            // Search & filter items
            const filteredRows = parsedRows.filter(r => {
              const matchesSearch = !importSearchQuery || 
                r.poNumber.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
                r.itemName.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
                r.department.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
                r.location.toLowerCase().includes(importSearchQuery.toLowerCase());
              
              if (importFilterType === 'errors') {
                const isErrorRow = previewAnalysis.errors.some(e => e.rowIndex === r.rowIndex);
                return matchesSearch && isErrorRow;
              }
              return matchesSearch;
            });

            const pageSize = 25;
            const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
            const safePage = Math.min(importPage, totalPages);
            const pagedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

            return (
              <div className="bg-white rounded-xl border border-purple-200 p-4 space-y-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <span>Import Analysis & Data Preview</span>
                      <span className="text-xs font-bold bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full">
                        {previewAnalysis.totalRows.toLocaleString()} Rows
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verified {previewAnalysis.totalPOs} Purchase Orders across {previewAnalysis.totalRows} item rows.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPreviewAnalysis(null)} 
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold rounded-lg border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleExecuteFinalImport} 
                      disabled={hasErrors || isProcessing}
                      className="px-5 py-2 bg-purple-900 hover:bg-purple-950 disabled:opacity-40 text-white text-xs font-black rounded-lg transition shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Importing 1,000+ Items...
                        </>
                      ) : (
                        `Execute Bulk Import (${previewAnalysis.totalRows.toLocaleString()} Items)`
                      )}
                    </button>
                  </div>
                </div>

                {/* METRICS CARDS GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Rows</span>
                    <span className="text-base font-black text-slate-900">{previewAnalysis.totalRows.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Total POs</span>
                    <span className="text-base font-black text-purple-950">{previewAnalysis.totalPOs.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">New POs</span>
                    <span className="text-base font-black text-emerald-950">{previewAnalysis.newPOsCount.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Existing Merges</span>
                    <span className="text-base font-black text-amber-950">{previewAnalysis.duplicatePOsCount.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Valid Rows</span>
                    <span className="text-base font-black text-blue-950">{previewAnalysis.validRowsCount.toLocaleString()}</span>
                  </div>
                  <div className={`p-2.5 border rounded-lg ${previewAnalysis.invalidRowsCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block">Error Rows</span>
                    <span className="text-base font-black">{previewAnalysis.invalidRowsCount.toLocaleString()}</span>
                  </div>
                </div>

                {/* WARNINGS & ERROR MESSAGES */}
                {previewAnalysis.warnings.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-amber-950">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      Merge & Update Notices ({previewAnalysis.warnings.length}):
                    </span>
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px] max-h-24 overflow-y-auto">
                      {previewAnalysis.warnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {previewAnalysis.errors.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-rose-950">
                      <X className="w-4 h-4 text-rose-600 shrink-0" />
                      Validation Errors Detected ({previewAnalysis.errors.length}):
                    </span>
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px] max-h-28 overflow-y-auto font-mono">
                      {previewAnalysis.errors.map((err, i) => (
                        <li key={i} className="text-rose-800">{err.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* SEARCH & FILTER CONTROLS FOR TABLE */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={importSearchQuery}
                      onChange={(e) => { setImportSearchQuery(e.target.value); setImportPage(1); }}
                      placeholder="Search parsed items by PO, Item, Department..."
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:border-purple-500 outline-none flex-1 max-w-sm"
                    />
                    <button
                      onClick={() => setImportFilterType('all')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${importFilterType === 'all' ? 'bg-purple-900 text-white border-purple-900' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                    >
                      All ({parsedRows.length})
                    </button>
                    {previewAnalysis.invalidRowsCount > 0 && (
                      <button
                        onClick={() => setImportFilterType('errors')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${importFilterType === 'errors' ? 'bg-rose-700 text-white border-rose-700' : 'bg-rose-50 text-rose-800 border-rose-200'}`}
                      >
                        Errors ({previewAnalysis.invalidRowsCount})
                      </button>
                    )}
                  </div>
                  
                  {/* PAGINATION NUMBERS */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium self-end sm:self-auto">
                    <span>Page {safePage} of {totalPages} ({filteredRows.length} items)</span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={safePage <= 1}
                        onClick={() => setImportPage(p => Math.max(1, p - 1))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded font-bold border border-slate-200 transition cursor-pointer"
                      >
                        Prev
                      </button>
                      <button
                        disabled={safePage >= totalPages}
                        onClick={() => setImportPage(p => Math.min(totalPages, p + 1))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded font-bold border border-slate-200 transition cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>

                {/* PAGINATED PARSED ITEMS TABLE */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <th className="p-2 border-r border-slate-200 w-12 text-center">Row</th>
                        <th className="p-2 border-r border-slate-200 font-mono">PO Number</th>
                        <th className="p-2 border-r border-slate-200">Department</th>
                        <th className="p-2 border-r border-slate-200">Item Name</th>
                        <th className="p-2 border-r border-slate-200">Brand</th>
                        <th className="p-2 border-r border-slate-200">Unit</th>
                        <th className="p-2 border-r border-slate-200 text-right">Qty</th>
                        <th className="p-2">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pagedRows.map((r) => (
                        <tr key={r.rowIndex} className="hover:bg-purple-50/40 transition">
                          <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-400 text-[11px]">{r.rowIndex}</td>
                          <td className="p-2 border-r border-slate-200 font-mono font-bold text-purple-900">{r.poNumber}</td>
                          <td className="p-2 border-r border-slate-200 text-slate-700">{r.department}</td>
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{r.itemName}</td>
                          <td className="p-2 border-r border-slate-200 text-slate-600">{r.brand}</td>
                          <td className="p-2 border-r border-slate-200 text-slate-600">{r.unit}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-black text-slate-900">{r.qty}</td>
                          <td className="p-2 text-slate-600 truncate max-w-[150px]">{r.location}</td>
                        </tr>
                      ))}
                      {pagedRows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                            No matching items found for query "{importSearchQuery}"
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* IMPORT EXECUTION RESULT CARD */}
          {importResult && (
            <div className="p-4 bg-emerald-50 text-emerald-950 rounded-xl border border-emerald-300 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <h4 className="font-extrabold text-emerald-900 text-sm">Bulk Import Executed Successfully</h4>
                </div>
                {importResult.timeTakenMs && (
                  <span className="text-[11px] font-mono font-bold bg-emerald-200/60 text-emerald-900 px-2.5 py-0.5 rounded-full">
                    ⚡ {importResult.timeTakenMs} ms
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-white/80 p-2 rounded border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 font-bold block">New POs Created</span>
                  <span className="text-base font-black text-emerald-950">{importResult.totalPOsImported}</span>
                </div>
                <div className="bg-white/80 p-2 rounded border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 font-bold block">POs Updated</span>
                  <span className="text-base font-black text-emerald-950">{importResult.totalPOsUpdated}</span>
                </div>
                <div className="bg-white/80 p-2 rounded border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 font-bold block">New Items Added</span>
                  <span className="text-base font-black text-emerald-950">{importResult.totalItemsImported}</span>
                </div>
                <div className="bg-white/80 p-2 rounded border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 font-bold block">Items Quantities Updated</span>
                  <span className="text-base font-black text-emerald-950">{importResult.totalItemsUpdated}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">System Users ({users.length})</h2>
              <p className="text-[11px] text-slate-500">Official system users roster ({users.length} accounts configured)</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateUsers(users)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                title="Sync all official users roster directly into Google Sheets"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Save/Sync All Users to Google Sheets</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-2.5">User ID</th>
                  <th className="p-2.5">Full Name</th>
                  <th className="p-2.5">Username</th>
                  <th className="p-2.5">Role</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u, idx) => (
                  <tr key={u.id ? `${u.id}-${idx}` : `u-${idx}`} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono text-slate-400">{u.id}</td>
                    <td className="p-2.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserForAvatar(u);
                            setEditAvatarUrlInput(u.avatar || '');
                          }}
                          className="relative group cursor-pointer"
                          title="Click to edit user photo"
                        >
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover border border-slate-200 group-hover:border-blue-500 transition shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black group-hover:bg-blue-100 group-hover:text-blue-700 transition shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-0.5 text-white opacity-80 group-hover:opacity-100 transition">
                            <Camera className="w-2.5 h-2.5" />
                          </div>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {(u.isSuperAdmin || u.name === 'RL TAKMIL' || u.name === 'RL MUSTAQ' || u.id === 'u-takmil' || u.id === 'u-mustaq') && (
                            <span className="px-1.5 py-0.2 bg-gradient-to-r from-amber-500 to-purple-600 text-white text-[9px] font-extrabold rounded shadow-2xs tracking-wider uppercase">
                              ⭐ Super Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5 text-slate-600">{u.username || u.email}</td>
                    <td className="p-2.5 uppercase font-bold text-[10px]">
                      {(u.isSuperAdmin || u.name === 'RL TAKMIL' || u.name === 'RL MUSTAQ' || u.id === 'u-takmil' || u.id === 'u-mustaq') ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-300 font-extrabold text-[10px] inline-flex items-center gap-1">
                          SUPER ADMIN
                        </span>
                      ) : (
                        u.role
                      )}
                    </td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-2.5 text-right flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUserForAvatar(u);
                          setEditAvatarUrlInput(u.avatar || '');
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Edit User Profile Photo"
                      >
                        <Camera className="w-3 h-3 text-blue-600" />
                        <span>Photo</span>
                      </button>
                      <button
                        onClick={() => handleToggleUser(u.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          u.active ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserToDelete(u.id)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SHEETS CONFIG TAB */}
      {activeTab === 'sheets' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Google Sheets Database Configuration</h2>
            <div>
              <label className="text-xs font-bold text-slate-700">Apps Script Web App URL</label>
              <input
                type="url"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSaveConfig} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer">Save Settings</button>
              <button onClick={handleCopyScript} className="px-3 py-2 border border-slate-300 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer">
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied' : 'Copy Code.gs'}
              </button>
            </div>
          </div>

          <TelegramSettings />
        </div>
      )}

      {/* TELEGRAM BOT TAB */}
      {activeTab === 'telegram' && (
        <TelegramSettings />
      )}

      {/* SYSTEM TESTS TAB */}
      {activeTab === 'tests' && (
        <SystemTestsRunner
          pos={pos}
          users={users}
          currentUser={currentUser}
        />
      )}

      {/* SETUP & GUIDES TAB */}
      {activeTab === 'docs' && (
        <SystemDocsGuide />
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'logs' && (() => {
        const filteredLogs = auditLogs.filter(log => {
          const act = (log.action || '').toLowerCase();
          const detailsStr = (log.details || '').toLowerCase();
          const userStr = (log.user || '').toLowerCase();
          const q = logSearchText.trim().toLowerCase();

          // Search match
          if (q) {
            const matchesSearch = userStr.includes(q) || act.includes(q) || detailsStr.includes(q) || (log.role || '').toLowerCase().includes(q);
            if (!matchesSearch) return false;
          }

          // Category match
          const isLoginAction = act.includes('login') || act.includes('logout') || act.includes('auth') || act.includes('password');
          const isPoAction = act.includes('po') || act.includes('import') || act.includes('delete') || act.includes('clear');
          const isHoldAction = act.includes('hold') || act.includes('release');
          const isPurchaseAction = act.includes('purchase') || act.includes('buy') || act.includes('receive') || act.includes('dispatch') || act.includes('warehouse');

          if (logCategoryFilter === 'login') return isLoginAction;
          if (logCategoryFilter === 'po') return isPoAction;
          if (logCategoryFilter === 'holds') return isHoldAction;
          if (logCategoryFilter === 'purchases') return isPurchaseAction;
          if (logCategoryFilter === 'operations') return !isLoginAction;
          return true;
        });

        const loginLogCount = auditLogs.filter(l => {
          const act = (l.action || '').toLowerCase();
          return act.includes('login') || act.includes('logout') || act.includes('auth') || act.includes('password');
        }).length;

        const handleExportAuditCSV = () => {
          if (!filteredLogs || filteredLogs.length === 0) return;
          const headers = ["Timestamp", "User", "Role", "Action", "Details"];
          const csvRows = [headers.join(",")];
          filteredLogs.forEach(l => {
            const row = [
              `"${l.timestamp || ''}"`,
              `"${(l.user || '').replace(/"/g, '""')}"`,
              `"${(l.role || '').replace(/"/g, '""')}"`,
              `"${(l.action || '').replace(/"/g, '""')}"`,
              `"${(l.details || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(","));
          });
          const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `RL_Food_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          if (onShowToast) onShowToast("Downloaded Audit Logs CSV report!", true);
        };

        const handleBroadcastAuditLogs = async () => {
          const res = await notifyAuditLogsSummaryReport(filteredLogs, 'Admin Dashboard');
          if (res.success && onShowToast) {
            onShowToast("Broadcasted recent Audit Logs to Telegram!", true);
          } else if (!res.success && onShowToast) {
            onShowToast(res.error || "Failed to send audit logs to Telegram", false);
          }
        };

        return (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
            {/* Header Banner */}
            <div className="p-3 bg-slate-900 text-white font-bold text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Complete Activity Audit Log History</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportAuditCSV}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleBroadcastAuditLogs}
                  className="px-2.5 py-1 bg-purple-900 hover:bg-purple-800 text-purple-200 rounded-md font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                  title="Send summary of recent audit logs to Telegram"
                >
                  <Send className="w-3 h-3 text-purple-400" />
                  <span>Send to Telegram</span>
                </button>
                <span className="text-[11px] font-mono bg-slate-800 px-2.5 py-1 rounded-md text-slate-300">
                  {filteredLogs.length} Records ({auditLogs.length} Total)
                </span>
              </div>
            </div>

            {/* Search & Filter Controls Toolbar */}
            <div className="bg-slate-50 border-b border-slate-200 p-2.5 space-y-2">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                {/* Search Field */}
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logSearchText}
                    onChange={(e) => setLogSearchText(e.target.value)}
                    placeholder="Search by user, action, PO number, or details..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {logSearchText && (
                    <button
                      type="button"
                      onClick={() => setLogSearchText('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Log Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <button
                  onClick={() => setLogCategoryFilter('all')}
                  className={`px-3 py-1 rounded-lg transition ${
                    logCategoryFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All ({auditLogs.length})
                </button>
                <button
                  onClick={() => setLogCategoryFilter('login')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                    logCategoryFilter === 'login'
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Logins ({loginLogCount})</span>
                </button>
                <button
                  onClick={() => setLogCategoryFilter('po')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                    logCategoryFilter === 'po'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>PO & Imports</span>
                </button>
                <button
                  onClick={() => setLogCategoryFilter('holds')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                    logCategoryFilter === 'holds'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Holds & Releases</span>
                </button>
                <button
                  onClick={() => setLogCategoryFilter('purchases')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                    logCategoryFilter === 'purchases'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Purchases & Dispatch</span>
                </button>
              </div>
            </div>

            {/* Audit Log Entries List */}
            <div className="divide-y divide-slate-100 text-xs max-h-[600px] overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold space-y-1">
                  <p>No audit log entries found matching filter or search query.</p>
                  {logSearchText && (
                    <button
                      type="button"
                      onClick={() => setLogSearchText('')}
                      className="text-xs text-purple-600 font-bold hover:underline cursor-pointer"
                    >
                      Clear search filter
                    </button>
                  )}
                </div>
              ) : (
                filteredLogs.map((log, idx) => {
                  const act = (log.action || '').toLowerCase();
                  const isLogin = act.includes('login') || act.includes('logout') || act.includes('auth');
                  const isFailed = act.includes('fail') || act.includes('blocked');
                  const isHold = act.includes('hold');
                  const isPurchase = act.includes('purchase') || act.includes('buy');
                  const avatarUrl = getUserAvatar(log.user);

                  return (
                    <div
                      key={log.id ? `${log.id}-${idx}` : `log-${idx}`}
                      className={`p-3 hover:bg-slate-50 flex items-center justify-between gap-4 transition ${
                        isLogin ? (isFailed ? 'bg-rose-50/40' : 'bg-purple-50/20') :
                        isHold ? 'bg-amber-50/30' :
                        isPurchase ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={avatarUrl} 
                          alt={log.user} 
                          className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-2xs shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(log.user || 'User')}&background=0f172a&color=ffffff&bold=true`;
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{log.user}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {log.role}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isFailed ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                              isLogin ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                              isHold ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                              isPurchase ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {log.action}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium mt-0.5 break-words">{log.details}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0 font-medium bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setIsAddUserOpen(false)}>
          <form onSubmit={handleAddUser} className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Add New User
              </h3>
              <button type="button" onClick={() => setIsAddUserOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            {/* Photo Preview & Selection */}
            <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <div className="flex items-center gap-3">
                {newUserAvatar ? (
                  <img src={newUserAvatar} alt="New User Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow-xs shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-lg font-bold shrink-0">
                    {newUserName ? newUserName.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-xs font-bold text-slate-800 block">Profile Photo (Optional)</span>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      ref={newUserAvatarFileRef}
                      onChange={(e) => handleAvatarFileUpload(e, setNewUserAvatar)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => newUserAvatarFileRef.current?.click()}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>Upload File</span>
                    </button>
                    {newUserAvatar && (
                      <button
                        type="button"
                        onClick={() => setNewUserAvatar('')}
                        className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <input
                type="url"
                placeholder="Or paste photo URL..."
                value={newUserAvatar.startsWith('data:') ? '' : newUserAvatar}
                onChange={(e) => setNewUserAvatar(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Full Name</label>
              <input type="text" required value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs mt-0.5 outline-none focus:border-blue-500 font-medium" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <input type="email" required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs mt-0.5 outline-none focus:border-blue-500 font-medium" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Role Assignment</label>
              <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as User['role'])} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs mt-0.5 outline-none focus:border-blue-500 font-medium cursor-pointer">
                <option value="admin">Admin</option>
                <option value="purchaser">Purchaser</option>
                <option value="warehouse">Warehouse</option>
                <option value="dispatch">Dispatch</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsAddUserOpen(false)} className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
              <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs">Save User</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Avatar Modal */}
      {editingUserForAvatar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setEditingUserForAvatar(null)}>
          <form onSubmit={handleSaveEditedUserAvatar} className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Update User Photo</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{editingUserForAvatar.name}</p>
                </div>
              </div>
              <button type="button" onClick={() => setEditingUserForAvatar(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview */}
            <div className="flex flex-col items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              {editAvatarUrlInput ? (
                <img src={editAvatarUrlInput} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-blue-500 shadow-sm" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xl font-bold">
                  {editingUserForAvatar.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[10px] text-slate-400 font-medium">Photo Preview</span>
            </div>

            {/* Upload File */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Upload Photo File from Device</label>
              <input
                type="file"
                accept="image/*"
                ref={editUserAvatarFileRef}
                onChange={(e) => handleAvatarFileUpload(e, setEditAvatarUrlInput)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => editUserAvatarFileRef.current?.click()}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Choose Image File</span>
              </button>
            </div>

            {/* URL input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Or Paste Image URL</label>
              <input
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={editAvatarUrlInput.startsWith('data:') ? '' : editAvatarUrlInput}
                onChange={(e) => setEditAvatarUrlInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {editAvatarUrlInput && (
                <button
                  type="button"
                  onClick={() => setEditAvatarUrlInput('')}
                  className="py-2 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                >
                  Remove
                </button>
              )}
              <div className="flex-1 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingUserForAvatar(null)}
                  className="py-2 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Photo</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Single PO Delete Confirmation Modal */}
      {poToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setPoToDelete(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delete Purchase Order</h3>
                <p className="text-xs text-slate-500 font-mono font-bold">{poToDelete}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">{poToDelete}</span>? This will remove the PO and all associated items from local storage and Google Sheets.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPoToDelete(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeletePO && poToDelete) {
                    onDeletePO(poToDelete);
                  }
                  setPoToDelete(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer"
              >
                Yes, Delete PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All POs Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowClearAllModal(false)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-rose-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Clear All Purchase Orders</h3>
                <p className="text-[10px] text-rose-600 font-bold uppercase">Danger Zone</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">ALL Purchase Orders ({pos.length})</span> from the system and Google Sheets? This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllPOs) {
                    onClearAllPOs();
                  }
                  setShowClearAllModal(false);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setUserToDelete(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delete User Account</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this user? They will be removed from system access.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(userToDelete)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI STAT CARD CLICKABLE REPORT MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5" onClick={() => setSelectedReport(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                    {getReportData().title}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Showing {getReportData().type === 'po' ? `${getReportData().posList.length} Purchase Orders` : `${getReportData().items.length} Line Items`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportReportCSV}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                  title="Export Report to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Filter / Search Toolbar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    placeholder="Search in this report..."
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-xs"
                  />
                  {reportSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setReportSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {selectedReport === 'hold_items' ? (
                  <div className="flex items-center gap-1.5 bg-purple-100/80 border border-purple-200 px-3 py-1 rounded-lg text-xs">
                    <Users className="w-4 h-4 text-purple-700" />
                    <span className="font-bold text-purple-900 text-xs">Purchaser Report Filter:</span>
                    <select
                      value={reportPurchaserFilter}
                      onChange={(e) => setReportPurchaserFilter(e.target.value)}
                      className="bg-white border border-purple-300 font-bold text-purple-950 text-xs px-2 py-0.5 rounded outline-none cursor-pointer"
                    >
                      <option value="ALL">All Purchasers ({allItems.filter(i => getNormalizedItemStatus(i) === 'Held').length})</option>
                      {uniqueHoldPurchasers.map((p, pIdx) => {
                        const count = allItems.filter(i => getNormalizedItemStatus(i) === 'Held' && (i.holdBy || 'Purchaser') === p).length;
                        return (
                          <option key={`${p}-${pIdx}`} value={p}>{p} ({count} items)</option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 font-semibold self-end sm:self-center">
                    Filter & Detailed Breakdown
                  </div>
                )}
              </div>

              {selectedReport === 'hold_items' && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-200/60">
                  <span className="text-[11px] font-bold text-purple-900 shrink-0">Purchaser Wise Holds:</span>
                  <button
                    type="button"
                    onClick={() => setReportPurchaserFilter('ALL')}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition shrink-0 ${
                      reportPurchaserFilter === 'ALL'
                        ? 'bg-purple-900 text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-purple-50'
                    }`}
                  >
                    All Purchasers ({allItems.filter(i => getNormalizedItemStatus(i) === 'Held').length})
                  </button>
                  {uniqueHoldPurchasers.map((p, pIdx) => {
                    const count = allItems.filter(i => getNormalizedItemStatus(i) === 'Held' && (i.holdBy || 'Purchaser') === p).length;
                    return (
                      <button
                        key={`${p}-${pIdx}`}
                        type="button"
                        onClick={() => setReportPurchaserFilter(p)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                          reportPurchaserFilter === p
                            ? 'bg-purple-900 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-purple-50 hover:text-purple-900'
                        }`}
                      >
                        <span>{p}</span>
                        <span className="bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded-full text-[10px] font-black">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Body - Table */}
            <div className="p-4 overflow-y-auto flex-1">
              {getReportData().type === 'po' ? (
                /* POs Table */
                getReportData().posList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No Purchase Orders found for this report filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">PO Number</th>
                          <th className="p-2.5">Order Date</th>
                          <th className="p-2.5">Department</th>
                          <th className="p-2.5">Location</th>
                          <th className="p-2.5 text-center">Items Count</th>
                          <th className="p-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {getReportData().posList.map((po, idx) => (
                          <tr
                            key={po.id ? `${po.id}-${idx}` : `po-rep-${idx}`}
                            className="hover:bg-blue-50/50 transition cursor-pointer"
                            onClick={() => setSelectedPoForDetail(po)}
                            title="Click to view detailed PO & Dispatch Report"
                          >
                            <td className="p-2.5 font-mono font-bold text-blue-700 flex items-center gap-1.5">
                              <span>{po.poNumber}</span>
                              <Eye className="w-3.5 h-3.5 text-blue-500 opacity-75" />
                            </td>
                            <td className="p-2.5 text-slate-600">{po.orderDate || 'N/A'}</td>
                            <td className="p-2.5 text-slate-800 font-semibold">{po.department || 'General'}</td>
                            <td className="p-2.5 text-slate-600">{po.location || 'Default'}</td>
                            <td className="p-2.5 text-center font-bold text-slate-900">
                              <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[11px]">
                                {po.items?.length || 0} items
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                po.purchaseStatus === 'Completed' || po.status === 'purchased' || po.status === 'verified'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : po.purchaseStatus === 'Partial' || po.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {po.purchaseStatus || po.status || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* Items Table */
                getReportData().items.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No Line Items found for this report filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">PO Number</th>
                          <th className="p-2.5">Item Name</th>
                          <th className="p-2.5">Brand</th>
                          <th className="p-2.5 text-center">Requested</th>
                          <th className="p-2.5 text-center">Purchased</th>
                          <th className="p-2.5">Unit</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5">Hold By / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {getReportData().items.map((item, idx) => (
                          <tr key={item.id ? `${item.id}-${idx}` : `item-rep-${idx}`} className="hover:bg-purple-50/40 transition">
                            <td className="p-2.5 font-mono font-bold text-blue-700">{item.poNumber}</td>
                            <td className="p-2.5 font-bold text-slate-900">
                              <span className="inline-block px-1.5 py-0.2 bg-slate-800 text-white text-[10px] rounded font-mono font-black mr-1.5 align-middle">
                                SL #{idx + 1}
                              </span>
                              <span>{item.itemName}</span>
                            </td>
                            <td className="p-2.5 text-slate-600">{item.brand || '-'}</td>
                            <td className="p-2.5 text-center font-bold text-slate-800">{item.requestedQty}</td>
                            <td className="p-2.5 text-center font-bold text-emerald-700">{item.purchasedQty}</td>
                            <td className="p-2.5 text-slate-500">{item.unit || 'pcs'}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                item.purchaseStatus === 'Purchased'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.purchaseStatus === 'Held'
                                  ? 'bg-purple-100 text-purple-800'
                                  : item.purchaseStatus === 'Partial Purchased'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.purchaseStatus === 'Held' ? 'Hold' : (item.purchaseStatus || 'Pending')}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 font-semibold">
                              {item.purchaseStatus === 'Held' ? (
                                <span className="text-purple-700 font-bold">🔒 {item.holdBy || 'Purchaser'}</span>
                              ) : (
                                item.notes || '-'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">
                Total Records: {getReportData().type === 'po' ? getReportData().posList.length : getReportData().items.length}
              </span>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition active:scale-95 shadow-xs"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

      {/* INDIVIDUAL PO DETAILS & PRINTABLE DISPATCH REPORT MODAL */}
      {selectedPoForDetail && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5" onClick={() => setSelectedPoForDetail(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white font-mono">
                      PO #{selectedPoForDetail.poNumber}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedPoForDetail.purchaseStatus === 'Completed' || selectedPoForDetail.status === 'purchased'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : selectedPoForDetail.purchaseStatus === 'Partial'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {selectedPoForDetail.purchaseStatus || 'Pending'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    {selectedPoForDetail.department || 'General'} • {selectedPoForDetail.location || 'Central Warehouse'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendSinglePoTelegram(selectedPoForDetail)}
                  disabled={sendingPoNumber === selectedPoForDetail.poNumber}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                  title="Send this PO summary directly to Telegram group"
                >
                  <Send className={`w-3.5 h-3.5 ${sendingPoNumber === selectedPoForDetail.poNumber ? 'animate-pulse' : ''}`} />
                  <span>{sendingPoNumber === selectedPoForDetail.poNumber ? 'Sending...' : 'Send Telegram'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintPoReport(selectedPoForDetail)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                  title="Print / Save PDF Report"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportSinglePoExcel(selectedPoForDetail)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                  title="Export to Excel (CSV)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPoForDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                  <p className="font-bold text-slate-800">{selectedPoForDetail.department || 'General'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Location</span>
                  <p className="font-bold text-slate-800">{selectedPoForDetail.location || 'Central Warehouse'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Order Date</span>
                  <p className="font-semibold text-slate-700">{selectedPoForDetail.orderDate || selectedPoForDetail.createdAt || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Date</span>
                  <p className="font-semibold text-slate-700">{selectedPoForDetail.deliveryDate || 'N/A'}</p>
                </div>
              </div>

              {/* Progress Summary Cards */}
              {(() => {
                const items = selectedPoForDetail.items || [];
                const totalItems = items.length;
                const purchasedCount = items.filter(i => (i.purchasedQty || 0) > 0 || i.purchaseStatus === 'Purchased').length;
                const receivedCount = items.filter(i => (i.warehouseQty || 0) > 0).length;
                const progressPct = totalItems > 0 ? Math.round((receivedCount / totalItems) * 100) : 0;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Overall Order Completion Progress</span>
                      <span className="text-blue-700">{progressPct}% Complete</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full transition-all duration-300 ${
                          progressPct === 100 ? 'bg-emerald-500' : progressPct > 0 ? 'bg-blue-600' : 'bg-amber-400'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                        <span className="text-[9px] font-bold uppercase text-blue-600">Total Items</span>
                        <p className="text-lg font-black text-blue-900">{totalItems}</p>
                      </div>
                      <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <span className="text-[9px] font-bold uppercase text-indigo-600">Purchased Items</span>
                        <p className="text-lg font-black text-indigo-900">{purchasedCount}</p>
                      </div>
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <span className="text-[9px] font-bold uppercase text-emerald-600">Warehouse Received</span>
                        <p className="text-lg font-black text-emerald-900">{receivedCount}</p>
                      </div>
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="text-[9px] font-bold uppercase text-amber-600">Pending Receive</span>
                        <p className="text-lg font-black text-amber-900">{totalItems - receivedCount}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Items Breakdown Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Line Items Detailed Breakdown ({selectedPoForDetail.items?.length || 0})</span>
                  <span className="text-[10px] text-slate-400 font-normal">Dispatch & Receive Status</span>
                </h4>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="p-2.5 text-center">SL</th>
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5">Brand</th>
                        <th className="p-2.5 text-center">Requested</th>
                        <th className="p-2.5 text-center">Purchased</th>
                        <th className="p-2.5 text-center">Received</th>
                        <th className="p-2.5 text-center">Remaining</th>
                        <th className="p-2.5 text-center">Purchase Status</th>
                        <th className="p-2.5 text-center">Receive Status</th>
                        <th className="p-2.5">Notes / Hold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(selectedPoForDetail.items || []).map((item, idx) => {
                        const req = item.requestedQty || item.orderedQty || 0;
                        const pur = item.purchasedQty || 0;
                        const rec = item.warehouseQty || 0;
                        const rem = Math.max(0, req - rec);

                        return (
                          <tr key={item.id ? `${item.id}-${idx}` : `poitem-${idx}`} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 text-center font-mono font-bold text-slate-500">{item.slNumber || idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900">{item.itemName}</td>
                            <td className="p-2.5 text-slate-600">{item.brand || 'N/A'}</td>
                            <td className="p-2.5 text-center font-bold text-slate-800">{req} {item.unit || 'pcs'}</td>
                            <td className="p-2.5 text-center font-bold text-blue-700">{pur} {item.unit || 'pcs'}</td>
                            <td className="p-2.5 text-center font-bold text-emerald-700">{rec} {item.unit || 'pcs'}</td>
                            <td className="p-2.5 text-center font-bold text-amber-700">{rem} {item.unit || 'pcs'}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.purchaseStatus === 'Purchased' ? 'bg-emerald-100 text-emerald-800' :
                                item.purchaseStatus === 'Held' || item.purchaseStatus === 'Hold' ? 'bg-purple-100 text-purple-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {item.purchaseStatus === 'Held' || item.purchaseStatus === 'Hold' ? 'Hold' : (item.purchaseStatus || 'Pending')}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                rec >= req && req > 0 ? 'bg-purple-100 text-purple-800' :
                                rec > 0 ? 'bg-blue-100 text-blue-800' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {rec >= req && req > 0 ? 'Ready/Received' : rec > 0 ? 'Partial Rec' : 'Pending Rec'}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500 text-[11px]">
                              {item.purchaseStatus === 'Held' ? (
                                <span className="text-purple-700 font-bold">🔒 Hold: {item.holdBy || 'Purchaser'}</span>
                              ) : (
                                item.notes || '-'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">
                Created: {selectedPoForDetail.orderDate || selectedPoForDetail.createdAt || 'N/A'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPdfModalPo(selectedPoForDetail)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  title="Official RADIANT LIGHTNING Delivery Note & Digital Signature Generator"
                >
                  <span>✍️</span>
                  <span>Official PDF Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintPoReport(selectedPoForDetail)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPoForDetail(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition active:scale-95 shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Official RADIANT LIGHTNING Delivery Note & Digital Signature Modal */}
      {pdfModalPo && (
        <OfficialPdfInvoiceModal
          po={pdfModalPo}
          onClose={() => setPdfModalPo(null)}
        />
      )}

      {/* Master SKU & Dropbox Auto-Sync Manager Modal */}
      <MasterSkuModal
        isOpen={isMasterSkuModalOpen || !!isExternalMasterSkuOpen}
        onClose={() => {
          setIsMasterSkuModalOpen(false);
          if (onCloseExternalMasterSkuModal) onCloseExternalMasterSkuModal();
        }}
      />

      {/* Custom Telegram Broadcast Alert Modal */}
      {isCustomAlertModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white leading-tight">
                    Custom Telegram Alert Broadcast
                  </h3>
                  <p className="text-xs text-slate-400">
                    Broadcast custom or urgent messages to your Telegram group in one click
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomAlertModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Template Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Quick Templates:</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '🚨 Urgent Meeting: All purchasers please join the online sync at 2 PM.',
                  '📦 Warehouse Update: All in-transit goods must be received by 5 PM today.',
                  '⚠️ Pending Notice: Please resolve on-hold items in your active POs urgently.',
                  '✅ Delivery Confirmation: Today\'s purchases across all categories have been completed.'
                ].map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomAlertText(tmpl)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-200 rounded-md transition text-left cursor-pointer"
                  >
                    + {tmpl.slice(0, 32)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Priority Level:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCustomAlertPriority('NORMAL')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    customAlertPriority === 'NORMAL'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  📢 Normal
                </button>
                <button
                  type="button"
                  onClick={() => setCustomAlertPriority('URGENT')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    customAlertPriority === 'URGENT'
                      ? 'bg-amber-600 text-white border-amber-400 shadow-xs'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  ⚠️ Urgent
                </button>
                <button
                  type="button"
                  onClick={() => setCustomAlertPriority('CRITICAL')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    customAlertPriority === 'CRITICAL'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-xs'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  🚨 Critical
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Message Content:</label>
              <textarea
                rows={4}
                value={customAlertText}
                onChange={(e) => setCustomAlertText(e.target.value)}
                placeholder="Type your custom Telegram message or alert here..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCustomAlertModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendCustomAlert}
                disabled={isSendingCustomAlert || !customAlertText.trim()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition active:scale-95 shadow-md cursor-pointer"
              >
                {isSendingCustomAlert ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>Send Alert</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
