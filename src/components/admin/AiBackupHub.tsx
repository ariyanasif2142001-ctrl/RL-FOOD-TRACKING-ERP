import React, { useState, useEffect, useRef } from 'react';
import { PurchaseOrder, AuditLog } from '../../types';
import { sendTelegramMessage } from '../../services/telegramService';
import { getMasterSKUMappings } from '../../services/skuService';
import { 
  Bot, Sparkles, Database, Download, RefreshCw, Send, Copy, Check, 
  Clock, ShieldCheck, FileSpreadsheet, FileText, HelpCircle, MessageSquare, 
  ArrowRight, AlertCircle, Save, HardDrive, Upload, CheckCircle2, Zap, Edit3 
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AiBackupHubProps {
  pos: PurchaseOrder[];
  auditLogs?: AuditLog[];
  onRestoreState?: (restoredPos: PurchaseOrder[]) => void;
}

// Levenshtein Distance for typo tolerance & fuzzy search
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a || !b) return (a || b).length;
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function isFuzzyMatch(token: string, targetWord: string): boolean {
  const t = token.toLowerCase().trim();
  const w = targetWord.toLowerCase().trim();
  if (!t || !w) return false;
  if (t === w) return true;
  if (t.length >= 3 && w.length >= 3) {
    if (w.includes(t) || t.includes(w)) return true;
    if (t.slice(0, 3) === w.slice(0, 3)) {
      const dist = levenshteinDistance(t, w);
      const maxDist = Math.max(t.length, w.length) <= 5 ? 1 : 3;
      if (dist <= maxDist) return true;
    } else {
      const dist = levenshteinDistance(t, w);
      const maxDist = Math.min(t.length, w.length) <= 5 ? 1 : 2;
      if (dist <= maxDist) return true;
    }
  }
  return false;
}

export const AiBackupHub: React.FC<AiBackupHubProps> = ({
  pos,
  auditLogs = [],
  onRestoreState
}) => {
  const [activeTab, setActiveTab] = useState<'query' | 'summary' | 'backup'>('query');

  // Query State
  const queryInputRef = useRef<HTMLInputElement>(null);
  const [queryInput, setQueryInput] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResponse, setQueryResponse] = useState<string | null>(null);
  const [queryCopied, setQueryCopied] = useState(false);

  // Executive Summary State
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramSuccess, setTelegramSuccess] = useState(false);

  // Backup Schedule State
  const [backupSchedule, setBackupSchedule] = useState<'disabled' | 'daily' | 'weekly' | 'monthly'>(() => {
    return (localStorage.getItem('rl_food_backup_schedule') as any) || 'daily';
  });
  const [backupFormat, setBackupFormat] = useState<'json' | 'xlsx' | 'csv'>(() => {
    return (localStorage.getItem('rl_food_backup_format') as any) || 'xlsx';
  });
  const [backupDestination, setBackupDestination] = useState<'download' | 'vault' | 'cloud'>(() => {
    return (localStorage.getItem('rl_food_backup_dest') as any) || 'download';
  });
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    return localStorage.getItem('rl_food_last_backup_time');
  });
  const [backupHistory, setBackupHistory] = useState<Array<{ id: string; time: string; count: number; format: string; size: string }>>(() => {
    try {
      const saved = localStorage.getItem('rl_food_backup_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  // Save config changes
  useEffect(() => {
    localStorage.setItem('rl_food_backup_schedule', backupSchedule);
    localStorage.setItem('rl_food_backup_format', backupFormat);
    localStorage.setItem('rl_food_backup_dest', backupDestination);
  }, [backupSchedule, backupFormat, backupDestination]);

  // Aggregate Data Stats for AI Context (Filtered to minimize payload size and avoid Gemini rate limits)
  const getDatasetStats = (userQueryForFilter?: string) => {
    const totalPOs = pos.length;
    const pendingPOs = pos.filter(p => p.purchaseStatus === 'Pending' || !p.purchaseStatus).length;
    const partialPOs = pos.filter(p => p.purchaseStatus === 'Partial').length;
    const completedPOs = pos.filter(p => p.purchaseStatus === 'Completed').length;

    let allItems: any[] = [];
    pos.forEach(p => {
      if (p.items) {
        p.items.forEach(i => allItems.push({ ...i, poNumber: p.poNumber, dept: p.department }));
      }
    });

    const totalItems = allItems.length;
    const purchasedItems = allItems.filter(i => i.purchaseStatus === 'Purchased').length;
    const heldItems = allItems.filter(i => i.onHold || i.purchaseStatus === 'Hold');

    // Master SKU Database - Sliced/Filtered to stay well under Gemini API token limits
    const rawMasterSkus = getMasterSKUMappings();
    let masterSkuDatabase = rawMasterSkus.map(s => {
      const cStr = String(s.costPrice || '').trim();
      const spStr = String(s.sellingPrice || '').trim();

      const c = parseFloat(cStr.replace(/[^0-9.]/g, ''));
      const sp = parseFloat(spStr.replace(/[^0-9.]/g, ''));

      const hasValidCost = !isNaN(c) && c > 0 && cStr.toUpperCase() !== 'N/A';
      const hasValidSell = !isNaN(sp) && sp > 0 && spStr.toUpperCase() !== 'N/A';

      const profit = (hasValidCost && hasValidSell) ? (sp - c) : 0;
      const margin = (hasValidCost && hasValidSell) ? Math.round(((sp - c) / c) * 1000) / 10 : 0;

      return {
        skuName: s.internalSKU || '',
        itemName: s.customerItemName || s.internalItemName || '',
        unit: s.internalUnit || 'PCS',
        costPrice: hasValidCost ? `${c.toFixed(2)}` : 'N/A',
        sellingPrice: hasValidSell ? `${sp.toFixed(2)}` : 'N/A',
        profitAmount: (hasValidCost && hasValidSell) ? profit.toFixed(2) : 'N/A',
        profitMarginPct: (hasValidCost && hasValidSell) ? `${margin}%` : 'N/A',
        hasValidCostAndSell: hasValidCost && hasValidSell,
        category: s.category || 'General'
      };
    });

    // If query provided, filter master SKUs to top relevant matches (max 25) to save tokens
    if (userQueryForFilter) {
      const qLower = userQueryForFilter.toLowerCase();
      const cleanedWords = qLower.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length >= 2);

      // 1. Direct SKU Code search detection (e.g. LP001368, 001368, IP000867)
      const directSkuMatches = masterSkuDatabase.filter(s => {
        const sName = s.skuName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const sDigits = s.skuName.replace(/[^0-9]/g, '');
        return cleanedWords.some(w => {
          if (w === sName) return true;
          if (w.length >= 3 && /^\d+$/.test(w) && (sDigits === w || (sDigits.length >= 4 && sDigits.endsWith(w)))) return true;
          return false;
        });
      });

      if (directSkuMatches.length > 0) {
        masterSkuDatabase = directSkuMatches;
      } else {
        const tokens = qLower.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);
        
        const isLocal = qLower.includes('local') || qLower.includes('lp') || qLower.includes('স্থানীয়');
        const isImport = qLower.includes('import') || qLower.includes('ip') || qLower.includes('আমদানি');
        const isVeg = qLower.includes('vegetable') || qLower.includes('veg') || qLower.includes('fresh') || qLower.includes('vf') || qLower.includes('শাকসবজি');
        const isProfit = qLower.includes('profit') || qLower.includes('labh') || qLower.includes('লাভ') || qLower.includes('margin') || qLower.includes('top 10') || qLower.includes('top10');

        if (isProfit) {
          let filtered = [...masterSkuDatabase];
          if (isLocal) filtered = filtered.filter(s => s.skuName.toUpperCase().startsWith('LP'));
          if (isImport) filtered = filtered.filter(s => s.skuName.toUpperCase().startsWith('IP'));
          if (isVeg) filtered = filtered.filter(s => s.skuName.toUpperCase().startsWith('VF'));
          
          filtered.sort((a, b) => {
            if (a.hasValidCostAndSell && !b.hasValidCostAndSell) return -1;
            if (!a.hasValidCostAndSell && b.hasValidCostAndSell) return 1;
            if (a.hasValidCostAndSell && b.hasValidCostAndSell) {
              return parseFloat(b.profitAmount) - parseFloat(a.profitAmount);
            }
            return 0;
          });
          masterSkuDatabase = filtered.slice(0, 25);
        } else if (isLocal || isImport || isVeg || tokens.length > 0) {
          const filtered = masterSkuDatabase.filter(s => {
            const skuCode = String(s.skuName).toUpperCase();
            const itemDesc = String(s.itemName).toLowerCase();

            if (isLocal && skuCode.startsWith('LP')) return true;
            if (isImport && skuCode.startsWith('IP')) return true;
            if (isVeg && skuCode.startsWith('VF')) return true;

            return tokens.some(t => {
              if (itemDesc.includes(t) || skuCode.toLowerCase().includes(t)) return true;
              const descWords = itemDesc.split(/[\s\-_,./()]+/);
              return descWords.some(w => w.length >= 3 && isFuzzyMatch(t, w));
            });
          });
          masterSkuDatabase = filtered.length > 0 ? filtered.slice(0, 25) : masterSkuDatabase.slice(0, 15);
        } else {
          masterSkuDatabase = masterSkuDatabase.slice(0, 15);
        }
      }
    } else {
      // For general executive summary, omit raw master SKU array to keep payload tiny
      masterSkuDatabase = [];
    }

    // Department Breakdown
    const deptStats: Record<string, { totalPOs: number; pendingPOs: number; totalItems: number }> = {};
    pos.forEach(p => {
      const d = p.department || 'General';
      if (!deptStats[d]) deptStats[d] = { totalPOs: 0, pendingPOs: 0, totalItems: 0 };
      deptStats[d].totalPOs += 1;
      if (p.purchaseStatus !== 'Completed') deptStats[d].pendingPOs += 1;
      deptStats[d].totalItems += p.items?.length || 0;
    });

    // Purchaser Hold Breakdown
    const holdByPurchaser: Record<string, number> = {};
    heldItems.forEach(i => {
      const purchaser = i.holdBy || 'Unassigned';
      holdByPurchaser[purchaser] = (holdByPurchaser[purchaser] || 0) + 1;
    });

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalPOs,
        pendingPOs,
        partialPOs,
        completedPOs,
        totalItems,
        purchasedItems,
        heldItemsCount: heldItems.length,
        completionRate: totalItems > 0 ? `${Math.round((purchasedItems / totalItems) * 100)}%` : '0%',
        masterSkuTotalCount: rawMasterSkus.length
      },
      masterSkuDatabase,
      departmentBreakdown: deptStats,
      heldItemsList: heldItems.map(i => ({ poNumber: i.poNumber, item: i.itemName, qty: i.requestedQty, purchaser: i.holdBy || 'Unassigned', reason: i.holdReason || 'Review' })),
      holdByPurchaser
    };
  };

  // Local Fallback Rule Engine for AI Query
  const generateLocalQueryAnswer = (query: string): string => {
    const q = query.toLowerCase().trim();
    const stats = getDatasetStats();
    const masterSkus = getMasterSKUMappings();

    // Detect user query language
    const isBangla = /[\u0980-\u09FF]/.test(query);
    const isMalayalam = /[\u0D00-\u0D7F]/.test(query);
    const isBanglish = /koto|dam|daam|dekho|dekhaw|bolo|bale|mamar|bhai|aca|ache|achhe|dita|diya|jiggas|suru|shuru|hoi|hoy|ki|daao|dao|lagano|paise|hobe|soho|bram|ami|tumi|apni|korci|kori|koro|bolbe|dibe|theka|theke|paoa/.test(q);

    // SKU Prefix query hints
    const isLocalQuery = q.includes('local') || q.includes('lp') || q.includes('স্থানীয়') || q.includes('স্থানিও');
    const isImportQuery = q.includes('import') || q.includes('imported') || q.includes('ip') || q.includes('আমদানি');
    const isVegQuery = q.includes('vegetable') || q.includes('veg') || q.includes('fresh') || q.includes('vf') || q.includes('শাকসবজি') || q.includes('সবজি');

    // Stop words to remove from search terms
    const stopWords = new Set([
      'how', 'much', 'price', 'cost', 'selling', 'what', 'is', 'the', 'of', 'for', 'sku', 'item', 'items', 'rate',
      'dam', 'daam', 'koto', 'and', 'in', 'a', 'list', 'show', 'me', 'please', 'tell', 'give', 'detail',
      'details', 'value', 'taka', 'tk', 'dekho', 'dekhaw', 'bolo', 'can', 'you', 'find', 'check', 'whats',
      'whose', 'which', 'products', 'product', 'all', 'a', 'local', 'import', 'imported', 'vegetable', 'veg', 'fresh',
      'lp', 'ip', 'vf', 'ami', 'jiggas', 'korci', 'kori', 'suru', 'hoi', 'dita', 'diya', 'theke', 'theka', 'ar'
    ]);

    const rawTokens = q.replace(/[^\w\s]/g, ' ').split(/\s+/);
    const queryKeywords = rawTokens.filter(t => t.length > 1 && !stopWords.has(t));

    // Direct / Explicit SKU Code Detection (e.g. LP001368, 001368, IP000867, VF000100)
    const cleanedQueryForSku = q.replace(/[^a-z0-9]/g, ' ');
    const queryWordsForSku = cleanedQueryForSku.split(/\s+/).filter(w => w.length >= 2);

    const exactSkuMatches = masterSkus.filter(s => {
      const rawSku = String(s.internalSKU || '').trim();
      if (!rawSku) return false;

      const skuNorm = rawSku.toLowerCase().replace(/[^a-z0-9]/g, '');
      const skuDigits = rawSku.replace(/[^0-9]/g, '');

      return queryWordsForSku.some(word => {
        const w = word.toLowerCase();
        // Exact match with normalized SKU code (e.g. "lp001368" or "ip000867")
        if (w === skuNorm) return true;
        
        // Match with SKU numeric code if digit string length >= 3 (e.g. "001368" or "1368")
        if (w.length >= 3 && /^\d+$/.test(w) && (skuDigits === w || (skuDigits.length >= 4 && skuDigits.endsWith(w)))) return true;

        return false;
      });
    });

    if (exactSkuMatches.length > 0) {
      const skuLines = exactSkuMatches.map(m => {
        const name = m.customerItemName || m.internalItemName;
        const sku = m.internalSKU || 'N/A';
        const cStr = String(m.costPrice || '').trim();
        const spStr = String(m.sellingPrice || '').trim();
        const costNum = parseFloat(cStr.replace(/[^0-9.]/g, ''));
        const sellNum = parseFloat(spStr.replace(/[^0-9.]/g, ''));

        const hasValidCost = !isNaN(costNum) && costNum > 0 && cStr.toUpperCase() !== 'N/A';
        const hasValidSell = !isNaN(sellNum) && sellNum > 0 && spStr.toUpperCase() !== 'N/A';

        const costStr = hasValidCost ? `${costNum.toFixed(2)}` : 'N/A (Cost Pending)';
        const sellStr = hasValidSell ? `${sellNum.toFixed(2)}` : 'N/A';
        const profitStr = (hasValidCost && hasValidSell) 
          ? (sellNum - costNum >= 0 ? `+${(sellNum - costNum).toFixed(2)}` : `${(sellNum - costNum).toFixed(2)}`)
          : 'Pending Cost Price';
        const marginStr = (hasValidCost && hasValidSell)
          ? `${(((sellNum - costNum) / costNum) * 100).toFixed(1)}%`
          : 'N/A';
        const unit = m.internalUnit || 'PCS';

        if (isBangla) {
          return `📦 **[\`${sku}\`] ${name}**
   • **ক্রয়মূল্য:** ${costStr} | **বিক্রয়মূল্য:** ${sellStr} (${unit})
   • 📈 **প্রতি ইউনিটে লাভ:** ${profitStr} | 📊 **প্রফিট মার্জিন:** ${marginStr}`;
        }

        if (isBanglish) {
          return `📦 **[\`${sku}\`] ${name}**
   • **Cost Price (Kroy Dam):** ${costStr} | **Selling Price (Bikroy Dam):** ${sellStr} (${unit})
   • 📈 **Unit Profit (Labh):** ${profitStr} | 📊 **Profit Margin:** ${marginStr}`;
        }

        if (isMalayalam) {
          return `📦 **[\`${sku}\`] ${name}**
   • **വാങ്ങിയ വില:** ${costStr} | **വിൽപ്പന വില:** ${sellStr} (${unit})
   • 📈 **യൂണിറ്റ് ലാഭം:** ${profitStr} | 📊 **പ്രോഫിറ്റ് മാർജിൻ:** ${marginStr}`;
        }

        return `📦 **[\`${sku}\`] ${name}**
   • **Cost Price:** ${costStr} | **Selling Price:** ${sellStr} (${unit})
   • 📈 **Profit / Unit:** ${profitStr} | 📊 **Profit Margin:** ${marginStr}`;
      }).join('\n\n');

      if (isBangla) {
        return `🎯 **নির্দিষ্ট SKU কোড অনুসন্ধান ফলাফল (${exactSkuMatches.length} টি মিল পাওয়া গেছে):**\n\n${skuLines}`;
      }
      if (isBanglish) {
        return `🎯 **Specific SKU Search Result (${exactSkuMatches.length} item match hoyeche):**\n\n${skuLines}`;
      }
      if (isMalayalam) {
        return `🎯 **വ്യക്തമായ SKU തിരച്ചിൽ ഫലം (${exactSkuMatches.length} ഇനങ്ങൾ):**\n\n${skuLines}`;
      }

      return `🎯 **Exact SKU Code Match (${exactSkuMatches.length} ${exactSkuMatches.length === 1 ? 'item' : 'items'} found):**\n\n${skuLines}`;
    }

    // Profit / Margin / Top 10 Profitable Items Query Handler
    const isProfitQuery = 
      q.includes('profit') || q.includes('labh') || q.includes('লাভ') || 
      q.includes('margin') || q.includes('profitable') || q.includes('loss') || 
      q.includes('ক্ষতি') || q.includes('top 10') || q.includes('top10') ||
      q.includes('most profitable');

    if (isProfitQuery && masterSkus.length > 0) {
      let candidateSkus = [...masterSkus];

      // Filter by side / category prefix if specified
      if (isLocalQuery) {
        candidateSkus = candidateSkus.filter(s => String(s.internalSKU || '').toUpperCase().startsWith('LP'));
      } else if (isImportQuery) {
        candidateSkus = candidateSkus.filter(s => String(s.internalSKU || '').toUpperCase().startsWith('IP'));
      } else if (isVegQuery) {
        candidateSkus = candidateSkus.filter(s => String(s.internalSKU || '').toUpperCase().startsWith('VF'));
      }

      if (candidateSkus.length === 0) {
        candidateSkus = [...masterSkus];
      }

      // Compute profit metrics
      const computed = candidateSkus.map(s => {
        const cStr = String(s.costPrice || '').trim();
        const spStr = String(s.sellingPrice || '').trim();

        const costNum = parseFloat(cStr.replace(/[^0-9.]/g, ''));
        const sellNum = parseFloat(spStr.replace(/[^0-9.]/g, ''));

        const hasValidCost = !isNaN(costNum) && costNum > 0 && cStr.toUpperCase() !== 'N/A';
        const hasValidSell = !isNaN(sellNum) && sellNum > 0 && spStr.toUpperCase() !== 'N/A';

        const profit = (hasValidCost && hasValidSell) ? (sellNum - costNum) : -999999;
        const marginPct = (hasValidCost && hasValidSell) ? (((sellNum - costNum) / costNum) * 100) : 0;

        return { s, costNum, sellNum, profit, marginPct, hasValidCost, hasValidSell };
      });

      // Filter valid items with both valid cost and sell prices
      const validProfitItems = computed.filter(x => x.hasValidCost && x.hasValidSell);
      validProfitItems.sort((a, b) => b.profit - a.profit);

      let finalDisplayList = validProfitItems.slice(0, 10);

      // If fewer than 10 valid items, append remaining items sorted by selling price
      if (finalDisplayList.length < 10) {
        const remaining = computed.filter(x => !x.hasValidCost || !x.hasValidSell);
        remaining.sort((a, b) => (b.sellNum || 0) - (a.sellNum || 0));
        finalDisplayList = [...finalDisplayList, ...remaining.slice(0, 10 - finalDisplayList.length)];
      }

      const sideLabel = isLocalQuery ? 'Local Side (LP SKUs)' : isImportQuery ? 'Import Side (IP SKUs)' : isVegQuery ? 'Vegetable & Fresh Side (VF SKUs)' : 'All Master SKUs';
      const sideLabelBn = isLocalQuery ? 'স্থানীয় পণ্য (LP SKU)' : isImportQuery ? 'আমদানিকৃত পণ্য (IP SKU)' : isVegQuery ? 'শাকসবজি ও ফ্রেশ (VF SKU)' : 'সকল মাস্টার SKU';
      const sideLabelMl = isLocalQuery ? 'ലോക്കൽ സൈഡ് (LP SKUs)' : isImportQuery ? 'ഇമ്പോർട്ട് സൈഡ് (IP SKUs)' : isVegQuery ? 'പച്ചക്കറികൾ (VF SKUs)' : 'എല്ലാ മാസ്റ്റർ SKU';

      const itemsFormatted = finalDisplayList.map((item, idx) => {
        const name = item.s.customerItemName || item.s.internalItemName;
        const sku = item.s.internalSKU || 'N/A';
        const costStr = item.hasValidCost ? `${item.costNum.toFixed(2)}` : 'N/A (Cost Pending)';
        const sellStr = item.hasValidSell ? `${item.sellNum.toFixed(2)}` : 'N/A';
        const profitStr = (item.hasValidCost && item.hasValidSell) 
          ? (item.profit >= 0 ? `+${item.profit.toFixed(2)}` : `${item.profit.toFixed(2)}`)
          : 'Pending Cost Price';
        const marginStr = (item.hasValidCost && item.hasValidSell)
          ? `${item.marginPct.toFixed(1)}%`
          : 'N/A';
        const unit = item.s.internalUnit || 'PCS';

        if (isBangla) {
          return `${idx + 1}. **[\`${sku}\`] ${name}**
   • **ক্রয়মূল্য:** ${costStr} | **বিক্রয়মূল্য:** ${sellStr} (${unit})
   • 📈 **প্রতি ইউনিটে লাভ:** ${profitStr} | 📊 **প্রফিট মার্জিন:** ${marginStr}`;
        }

        if (isBanglish) {
          return `${idx + 1}. **[\`${sku}\`] ${name}**
   • **Cost Price (Kroy Dam):** ${costStr} | **Selling Price (Bikroy Dam):** ${sellStr} (${unit})
   • 📈 **Unit Profit (Labh):** ${profitStr} | 📊 **Profit Margin:** ${marginStr}`;
        }

        if (isMalayalam) {
          return `${idx + 1}. **[\`${sku}\`] ${name}**
   • **വാങ്ങിയ വില:** ${costStr} | **വിൽപ്പന വില:** ${sellStr} (${unit})
   • 📈 **യൂണിറ്റ് ലാഭം:** ${profitStr} | 📊 **പ്രോഫിറ്റ് മാർജിൻ:** ${marginStr}`;
        }

        return `${idx + 1}. **[\`${sku}\`] ${name}**
   • **Cost Price:** ${costStr} | **Selling Price:** ${sellStr} (${unit})
   • 📈 **Profit / Unit:** ${profitStr} | 📊 **Profit Margin:** ${marginStr}`;
      }).join('\n\n');

      if (isBangla) {
        return `📊 **শীর্ষ ১০ টি সর্বাধিক লাভজনক পণ্যের তালিকা (${sideLabelBn}):**\n\n${itemsFormatted}\n\n💡 *নোট:* সঠিক প্রফিট গণনার জন্য ক্রয়মূল্য (Cost Price) আবশ্যক। ক্রয়মূল্য না থাকলে 'Cost Pending' হিসেবে রাখা হয়েছে।`;
      }
      if (isBanglish) {
        return `📊 **Top 10 Most Profitable Items List (${sideLabel}):**\n\n${itemsFormatted}\n\n💡 *Note:* Accurate profit compute korar jonno Cost Price ebong Selling Price dutoii lagbe. Cost price na thakle 'Cost Pending' dekhabe.`;
      }
      if (isMalayalam) {
        return `📊 **ഏറ്റവും കൂടുതൽ ലാഭമുള്ള 10 ഉൽപ്പന്നങ്ങൾ (${sideLabelMl}):**\n\n${itemsFormatted}\n\n💡 *സൂചന:* കൃത്യമായ ലാഭം അറിയാൻ വാങ്ങിയ വിലയും വിൽപ്പന വിലയും ആവശ്യമാണ്.`;
      }

      return `📊 **Top 10 Most Profitable Items List (${sideLabel}):**\n\n${itemsFormatted}\n\n💡 *Note:* Accurate profit calculation requires both valid Cost Price and Selling Price. Items with missing cost show 'Cost Pending'.`;
    }

    // Check if user is asking about price / SKU or specific keywords
    const isPriceOrSkuQuery = 
      q.includes('price') || q.includes('cost') || q.includes('selling') || 
      q.includes('sku') || q.includes('dam') || q.includes('daam') || 
      q.includes('rate') || q.includes('কত') || q.includes('দাম') || q.includes('টাকা') ||
      isLocalQuery || isImportQuery || isVegQuery || queryKeywords.length > 0;

    if (isPriceOrSkuQuery && masterSkus.length > 0) {
      // Calculate relevance score for each Master SKU entry
      const scored = masterSkus.map(s => {
        const itemDesc = String(s.customerItemName || s.internalItemName || '').toLowerCase();
        const skuCode = String(s.internalSKU || '').toLowerCase();
        const upperSku = String(s.internalSKU || '').toUpperCase();
        const category = String(s.category || '').toLowerCase();

        let score = 0;
        let wordMatches = 0;

        // Prefix bonuses
        if (isLocalQuery && upperSku.startsWith('LP')) {
          score += 150;
          wordMatches += 1;
        }
        if (isImportQuery && upperSku.startsWith('IP')) {
          score += 150;
          wordMatches += 1;
        }
        if (isVegQuery && upperSku.startsWith('VF')) {
          score += 150;
          wordMatches += 1;
        }

        let matchedFuzzyWord = '';

        queryKeywords.forEach(word => {
          let wordMatched = false;

          if (skuCode === word) {
            score += 100;
            wordMatched = true;
          } else if (skuCode.includes(word)) {
            score += 40;
            wordMatched = true;
          }

          const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
          if (wordRegex.test(itemDesc)) {
            score += 30;
            wordMatched = true;
          } else if (itemDesc.includes(word)) {
            score += 15;
            wordMatched = true;
          } else {
            const descWords = itemDesc.split(/[\s\-_,./()]+/);
            for (const dWord of descWords) {
              if (dWord.length >= 3 && isFuzzyMatch(word, dWord)) {
                score += 25;
                wordMatched = true;
                if (!matchedFuzzyWord) matchedFuzzyWord = dWord.toUpperCase();
                break;
              }
            }
          }

          if (category.includes(word)) {
            score += 5;
            wordMatched = true;
          }

          if (wordMatched) {
            wordMatches += 1;
          }
        });

        return { s, score, wordMatches, matchedFuzzyWord };
      });

      // Filter entries with positive score
      const validMatches = scored.filter(x => x.score > 0 && x.wordMatches > 0);

      if (validMatches.length > 0) {
        const maxWordMatches = Math.max(...validMatches.map(x => x.wordMatches));
        const topMatches = validMatches.filter(x => x.wordMatches === maxWordMatches);
        topMatches.sort((a, b) => b.score - a.score);

        const matches = topMatches.map(x => x.s);
        const topFuzzyWord = topMatches.find(x => x.matchedFuzzyWord)?.matchedFuzzyWord;

        if (matches.length > 0) {
          let fuzzyPrefix = '';
          if (topFuzzyWord) {
            if (isBangla) {
              fuzzyPrefix = `🔍 *আপনি লিখেছেন: "${queryKeywords.join(' ')}", আমরা **"${topFuzzyWord}"** হিসেবে অনুসন্ধান ফলাফল দেখাচ্ছি:*\n\n`;
            } else if (isBanglish) {
              fuzzyPrefix = `🔍 *Aponi likhechen: "${queryKeywords.join(' ')}", amra **"${topFuzzyWord}"** hisebe item khuje peyechi:*\n\n`;
            } else if (isMalayalam) {
              fuzzyPrefix = `🔍 *കണ്ടെത്തിയഫലം: **"${topFuzzyWord}"** (തിരഞ്ഞത്: "${queryKeywords.join(' ')}"):*\n\n`;
            } else {
              fuzzyPrefix = `🔍 *Showing results for **"${topFuzzyWord}"** (corrected from search term '${queryKeywords.join(' ')}'):*\n\n`;
            }
          }

          const skuLines = matches.slice(0, 10).map(m => {
            const name = m.customerItemName || m.internalItemName;
            const sku = m.internalSKU || 'N/A';
            const cost = m.costPrice ? `${m.costPrice}` : 'N/A';
            const selling = m.sellingPrice ? `${m.sellingPrice}` : 'N/A';
            const unit = m.internalUnit || 'PCS';

            if (isBangla) {
              return `• **SKU কোড / নাম:** \`${sku}\`
  📦 **পণ্যের নাম:** ${name}
  💵 **ক্রয়মূল্য:** ${cost} | 🏷️ **বিক্রয়মূল্য:** ${selling} (${unit})`;
            }

            if (isBanglish) {
              return `• **SKU Code / Name:** \`${sku}\`
  📦 **Item Name:** ${name}
  💵 **Cost Price (Kroy Dam):** ${cost} | 🏷️ **Selling Price (Bikroy Dam):** ${selling} (${unit})`;
            }

            if (isMalayalam) {
              return `• **SKU കോഡ് / പേര്:** \`${sku}\`
  📦 **ഉൽപ്പന്നത്തിന്റെ പേര്:** ${name}
  💵 **വാങ്ങിയ വില:** ${cost} | 🏷️ **വിൽപ്പന വില:** ${selling} (${unit})`;
            }

            return `• **SKU Name / Code:** \`${sku}\`
  📦 **Item Name:** ${name}
  💵 **Cost Price:** ${cost} | 🏷️ **Selling Price:** ${selling} (${unit})`;
          }).join('\n\n');

          if (isBangla) {
            return `${fuzzyPrefix}🏷️ **মাস্টার এসকেইউ মূল্য ও পণ্যের বিবরণ (${matches.length} টি মিল পাওয়া গেছে):**\n\n${skuLines}\n\n💡 *টিপ:* স্থানীয় পণ্যের জন্য LP, আমদানির জন্য IP, এবং শাকসবজির জন্য VF SKU কোড ব্যবহার করুন!`;
          }
          if (isBanglish) {
            return `${fuzzyPrefix}🏷️ **Master SKU Price & Product Info (${matches.length} ta item paise):**\n\n${skuLines}\n\n💡 *Tip:* Local item LP, Import item IP, and Vegetables VF SKU prefix use korun!`;
          }
          if (isMalayalam) {
            return `${fuzzyPrefix}🏷️ **മാസ്റ്റർ SKU വിലയും ഉൽപ്പന്ന വിവരങ്ങളും (${matches.length} ഇനങ്ങൾ കണ്ടെത്തി):**\n\n${skuLines}\n\n💡 *സൂചന:* ലോക്കൽ ഐറ്റങ്ങൾക്ക് LP, ഇമ്പോർട്ടിന് IP, പച്ചക്കറികൾക്ക് VF SKU ഉപയോഗിക്കുക!`;
          }

          return `${fuzzyPrefix}🏷️ **Master SKU Price & Product Information (${matches.length} ${matches.length === 1 ? 'exact match' : 'matching items'}):**\n\n${skuLines}\n\n💡 *Note:* Local products start with 'LP', Imported items with 'IP', and Vegetables/Fresh with 'VF'!`;
        }
      }

      // No matching SKU found
      if (isBangla) {
        return `❌ **কোনো পণ্য পাওয়া যায়নি:** মাস্টার এসকেইউ ডেটাবেসে **"${queryKeywords.join(' ')}"** এর সাথে মেলে এমন কোনো পণ্য পাওয়া যায়নি।\n\n💡 *টিপ:* পণ্যের সঠিক বানান বা SKU কোড (যেমন local item এর জন্য LP-...) দিয়ে খুঁজুন।`;
      }
      if (isBanglish) {
        return `❌ **Kono Product Paoa Jayni:** Master SKU database e **"${queryKeywords.join(' ')}"** er sathe match kore amon kono item paoa jayni.\n\n💡 *Tip:* Product er sothik banan ba LP/IP/VF SKU code diye khoj korun.`;
      }
      if (isMalayalam) {
        return `❌ **ഉൽപ്പന്നം കണ്ടെത്തിയില്ല:** മാസ്റ്റർ SKU ഡാറ്റാബേസിൽ **"${queryKeywords.join(' ')}"** മായി പൊരുത്തപ്പെടുന്ന ഇനങ്ങളൊന്നും ലഭിച്ചില്ല.\n\n💡 *സൂചന:* ദയവായി അക്ഷരവിന്യാസം പരിശോധിക്കുക അല്ലെങ്കിൽ SKU കോഡ് ഉപയോഗിക്കുക.`;
      }

      return `❌ **No Matching Item Found:** Could not find any item matching **"${queryKeywords.join(' ')}"** in the Master SKU database.\n\n💡 *Tip:* Local items start with LP, Imported items with IP, and Vegetables with VF.`;
    }

    if (q.includes('pending')) {
      let deptText = Object.entries(stats.departmentBreakdown)
        .map(([dept, d]) => `• **${dept}**: ${d.pendingPOs} pending POs (out of ${d.totalPOs} total)`)
        .join('\n');
      return `📌 **Pending Orders Analysis:**\n\nCurrently, there are **${stats.summary.pendingPOs} pending POs** and **${stats.summary.partialPOs} partially processed POs**.\n\n**Department Breakdown:**\n${deptText || 'No pending orders.'}\n\n💡 *Recommendation:* Contact the purchasing team to confirm pending procurement items.`;
    }

    if (q.includes('hold')) {
      if (stats.heldItemsList.length === 0) {
        return `✅ **Hold Status:** No items are currently on hold in the system. Operations are running smoothly!`;
      }
      let holdText = stats.heldItemsList
        .map(h => `• **PO #${h.poNumber}**: ${h.item} (${h.qty}) - *Held by:* **${h.purchaser}**`)
        .join('\n');
      return `🔒 **Items on Hold (${stats.summary.heldItemsCount} items):**\n\n${holdText}\n\n💡 *Recommendation:* Review and release pending holds directly from the Purchaser Hold Monitor.`;
    }

    if (q.includes('progress') || q.includes('complete') || q.includes('completed')) {
      return `📊 **Overall Operational Progress:**\n\n• **Total PO Count:** ${stats.summary.totalPOs}\n• **Completed POs:** ${stats.summary.completedPOs}\n• **Total Items:** ${stats.summary.totalItems}\n• **Purchased Items:** ${stats.summary.purchasedItems}\n• **Completion Rate:** **${stats.summary.completionRate}**`;
    }

    // Default intelligent general summary
    return `🤖 **System Data Insights:**\n\nThere are **${stats.summary.totalPOs} Purchase Orders** and **${stats.summary.masterSkuTotalCount} Master SKUs** in the database.\n\n• **Completed POs:** ${stats.summary.completedPOs}\n• **Pending / Partial POs:** ${stats.summary.pendingPOs + stats.summary.partialPOs}\n• **Items on Hold:** ${stats.summary.heldItemsCount}\n• **Current Completion Rate:** ${stats.summary.completionRate}\n\nAsk about any item's price, cost, selling price, or SKU name to get instant details!`;
  };

  // Handle AI Query Submission
  const handleAskAi = async (overridePrompt?: string) => {
    const promptToUse = overridePrompt || queryInput;
    if (!promptToUse.trim()) return;

    setQueryLoading(true);
    setQueryResponse(null);

    const stats = getDatasetStats(promptToUse);

    try {
      const res = await fetch('/api/gemini/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: promptToUse,
          datasetStats: stats
        })
      });

      if (!res.ok) {
        const localAns = generateLocalQueryAnswer(promptToUse);
        setQueryResponse(localAns);
      } else {
        const data = await res.json();
        setQueryResponse((data.fallback || !data.text) ? generateLocalQueryAnswer(promptToUse) : data.text);
      }
    } catch {
      setQueryResponse(generateLocalQueryAnswer(promptToUse));
    } finally {
      setQueryLoading(false);
    }
  };

  // Handle Generate Executive Summary
  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    setSummaryText(null);
    setTelegramSuccess(false);

    const stats = getDatasetStats();

    try {
      const res = await fetch('/api/gemini/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetStats: stats })
      });

      if (!res.ok) {
        const fallbackSummary = `📊 **RL FOOD EXECUTIVE OPERATIONAL SUMMARY**
📅 **Date & Time:** ${new Date().toLocaleString()}

1. **Executive Overview:**
   • Active POs: ${stats.summary.totalPOs}
   • Total Items Processed: ${stats.summary.totalItems}
   • Overall Operational Progress: **${stats.summary.completionRate}**

2. **Status Breakdown:**
   • 🟢 Completed: ${stats.summary.completedPOs}
   • 🔵 Partially Completed: ${stats.summary.partialPOs}
   • 🟡 Pending Processing: ${stats.summary.pendingPOs}

3. **Hold & Risk Monitor:**
   • 🔒 Items on Hold: **${stats.summary.heldItemsCount}**
   ${Object.entries(stats.holdByPurchaser).map(([p, cnt]) => `  - ${p}: ${cnt} items`).join('\n') || '  - No items currently on hold'}

4. **Actionable Recommendations:**
   • Expedite pending items with the respective purchasing teams.
   • Verify department-wise stock logs and delivery receipts.`;
        setSummaryText(fallbackSummary);
      } else {
        const data = await res.json();
        setSummaryText(data.text);
      }
    } catch {
      const fallbackSummary = `📊 **RL FOOD EXECUTIVE SUMMARY**
• Total POs: ${stats.summary.totalPOs} | Completed: ${stats.summary.completedPOs} | Pending: ${stats.summary.pendingPOs}
• Held Items: ${stats.summary.heldItemsCount} | Progress: ${stats.summary.completionRate}`;
      setSummaryText(fallbackSummary);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Send Summary to Telegram
  const handleSendSummaryToTelegram = async () => {
    if (!summaryText) return;
    setSendingTelegram(true);
    setTelegramSuccess(false);

    const formatted = `<b>🤖 AI EXECUTIVE OPERATIONS REPORT</b>\n\n${summaryText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`;
    const res = await sendTelegramMessage(formatted);
    
    setSendingTelegram(false);
    if (res.success) {
      setTelegramSuccess(true);
      setTimeout(() => setTelegramSuccess(false), 4000);
    } else {
      alert(`Telegram send failed: ${res.error}`);
    }
  };

  // Execute Backup Now
  const handleBackupNow = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `RL_Food_Database_Backup_${timestamp}`;
    const nowStr = new Date().toLocaleString();

    let backupDataSize = '0 KB';

    if (backupFormat === 'json') {
      const fullSnapshot = {
        app: 'RL Food Purchase Tracking System',
        exportedAt: new Date().toISOString(),
        totalPOs: pos.length,
        pos,
        auditLogs
      };
      const jsonStr = JSON.stringify(fullSnapshot, null, 2);
      backupDataSize = `${(jsonStr.length / 1024).toFixed(1)} KB`;

      if (backupDestination === 'download' || backupDestination === 'vault') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else if (backupFormat === 'xlsx') {
      const poRows = pos.map(p => ({
        'PO Number': p.poNumber,
        'Department': p.department || '',
        'Location': p.location || '',
        'Order Date': p.orderDate || '',
        'Status': p.purchaseStatus || 'Pending',
        'Total Items': p.items?.length || 0,
        'Purchased Items': (p.items || []).filter(i => i.purchaseStatus === 'Purchased').length,
        'Created At': p.createdAt || ''
      }));

      const itemRows: any[] = [];
      pos.forEach(p => {
        (p.items || []).forEach((item, idx) => {
          itemRows.push({
            'PO Number': p.poNumber,
            'Item Index': idx + 1,
            'Item Name': item.itemName,
            'Brand': item.brand || '',
            'Requested Qty': item.requestedQty,
            'Purchased Qty': item.purchasedQty || 0,
            'Unit': item.unit || '',
            'Status': item.purchaseStatus || 'Pending',
            'On Hold': item.onHold ? 'YES' : 'NO',
            'Hold By': item.holdBy || '',
            'Hold Reason': item.holdReason || ''
          });
        });
      });

      const wb = XLSX.utils.book_new();
      const wsPO = XLSX.utils.json_to_sheet(poRows);
      const wsItems = XLSX.utils.json_to_sheet(itemRows);

      XLSX.utils.book_append_sheet(wb, wsPO, 'Purchase Orders');
      XLSX.utils.book_append_sheet(wb, wsItems, 'PO Items');

      XLSX.writeFile(wb, `${filename}.xlsx`);
      backupDataSize = `${(poRows.length * 0.5).toFixed(1)} KB`;
    } else {
      const headers = ['PO Number,Department,Location,Order Date,Status,Items Count\n'];
      const rows = pos.map(p => `"${p.poNumber}","${p.department || ''}","${p.location || ''}","${p.orderDate || ''}","${p.purchaseStatus || 'Pending'}",${p.items?.length || 0}`);
      const csvStr = headers.concat(rows.join('\n')).join('');
      backupDataSize = `${(csvStr.length / 1024).toFixed(1)} KB`;

      const blob = new Blob([csvStr], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setLastBackupTime(nowStr);
    localStorage.setItem('rl_food_last_backup_time', nowStr);

    const newHistoryItem = {
      id: Date.now().toString(),
      time: nowStr,
      count: pos.length,
      format: backupFormat.toUpperCase(),
      size: backupDataSize
    };

    const updatedHistory = [newHistoryItem, ...backupHistory.slice(0, 9)];
    setBackupHistory(updatedHistory);
    localStorage.setItem('rl_food_backup_history', JSON.stringify(updatedHistory));
  };

  // Restore JSON File
  const handleFileUploadRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (parsed.pos && Array.isArray(parsed.pos)) {
          if (onRestoreState) {
            onRestoreState(parsed.pos);
            setRestoreMessage(`✅ Successfully restored ${parsed.pos.length} Purchase Orders from backup file!`);
          } else {
            setRestoreMessage(`✅ Valid backup file detected containing ${parsed.pos.length} POs.`);
          }
        } else if (Array.isArray(parsed)) {
          if (onRestoreState) {
            onRestoreState(parsed);
            setRestoreMessage(`✅ Successfully restored ${parsed.length} Purchase Orders!`);
          }
        } else {
          setRestoreMessage(`❌ Invalid backup format. File must contain a valid PO database structure.`);
        }
      } catch {
        setRestoreMessage(`❌ Failed to parse JSON file. Ensure it is a valid JSON backup.`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#072417] via-[#0E3A24] to-[#072417] text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-xl shadow-md text-white">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                AI Operations & Backup Intelligence Hub
              </h2>
              <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-200 text-[10px] font-bold rounded-full border border-emerald-400/30">
                Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              One-click AI Summary Report, Natural Language PO Query, and Automated Database Backup
            </p>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex flex-wrap items-center gap-1 bg-emerald-950/80 p-1 rounded-xl border border-emerald-800/60 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('query')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              activeTab === 'query'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>1. AI Query</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>2. AI Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>3. Auto Backup</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AI NATURAL LANGUAGE PO QUERY */}
      {activeTab === 'query' && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                AI Natural Language PO Query
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ask any question about your PO database to get instant, accurate AI-powered operational insights.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100 hidden sm:inline-block">
              Powered by Gemini AI
            </span>
          </div>

          {/* Prompt Suggestions Pills */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                Quick Prompt Suggestions (Click to ask format):
              </span>
              <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 hidden sm:inline-block">
                Click format to paste & edit before asking
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                'What is the cost & selling price for [Item Name / SKU]?',
                'Show full details & status for PO #[PO Number]',
                'Which departments have pending POs in [Month / Year]?',
                'Show list of items currently on hold for [Purchaser / Department]',
                'Show Master SKU item prices and SKU names for [Item Name]',
                'What is the delivery status for PO #[PO Number]?',
                'Show purchase history for vendor [Supplier Name]',
                'What is the overall delivery progress percentage?'
              ].map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQueryInput(s);
                    setTimeout(() => {
                      queryInputRef.current?.focus();
                    }, 50);
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-950 text-slate-700 border border-slate-200 hover:border-indigo-300 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap group"
                  title="Click to paste this question format into the query box"
                >
                  <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                    {idx + 1}
                  </span>
                  <span>{s}</span>
                  <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 ml-0.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar Input */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <input
                ref={queryInputRef}
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                placeholder="Ask anything about PO data... (e.g., What is the cost & selling price for [Item Name]?)"
                className="flex-1 bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-slate-900 text-xs sm:text-sm rounded-xl px-4 py-3 outline-none transition font-medium"
              />
              <button
                type="button"
                onClick={() => handleAskAi()}
                disabled={queryLoading || !queryInput.trim()}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer shrink-0"
              >
                {queryLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Ask AI</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Response Box */}
          {queryResponse && (
            <div className="bg-slate-900 text-slate-100 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3 relative shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span>AI Response & Data Insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(queryResponse);
                      setQueryCopied(true);
                      setTimeout(() => setQueryCopied(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    {queryCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{queryCopied ? 'Copied!' : 'Copy Answer'}</span>
                  </button>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2 font-sans whitespace-pre-line">
                {queryResponse}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI EXECUTIVE OPERATIONAL SUMMARY */}
      {activeTab === 'summary' && (
        <div className="p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                AI Executive Operational Summary
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate a concise, professional executive report on today's operations with a single click.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={summaryLoading}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Sparkles className={`w-4 h-4 ${summaryLoading ? 'animate-spin' : ''}`} />
              <span>{summaryLoading ? 'Generating AI Report...' : '⚡ Generate Summary Report'}</span>
            </button>
          </div>

          {/* Render Summary Report Box */}
          {summaryText ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <span className="text-xs font-bold uppercase text-purple-900 tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Generated AI Operations Summary:
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(summaryText);
                      setSummaryCopied(true);
                      setTimeout(() => setSummaryCopied(false), 2000);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    {summaryCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{summaryCopied ? 'Copied' : 'Copy Text'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendSummaryToTelegram}
                    disabled={sendingTelegram}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${sendingTelegram ? 'animate-pulse' : ''}`} />
                    <span>{sendingTelegram ? 'Sending...' : 'Send to Telegram Channel'}</span>
                  </button>
                </div>
              </div>

              {telegramSuccess && (
                <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Report successfully published to connected Telegram channel!</span>
                </div>
              )}

              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-line shadow-2xs">
                {summaryText}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <Sparkles className="w-10 h-10 text-purple-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">No Summary Generated Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click the <strong>"⚡ Generate Summary Report"</strong> button above to instantly synthesize today's purchase orders, status updates, holds, and department breakdown.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUTOMATED BACKUP & SCHEDULED EXPORT CENTER */}
      {activeTab === 'backup' && (
        <div className="p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-600" />
                Automated Backup & Scheduled Export Center
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Schedule daily, weekly, or monthly database backups to Excel, JSON, or CSV formats.
              </p>
            </div>

            <button
              type="button"
              onClick={handleBackupNow}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Backup Now</span>
            </button>
          </div>

          {/* Backup Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Frequency */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Backup Frequency:</span>
              </label>
              <select
                value={backupSchedule}
                onChange={(e) => setBackupSchedule(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="daily">Daily Automatic Backup</option>
                <option value="weekly">Weekly Automatic Backup</option>
                <option value="monthly">Monthly Automatic Backup</option>
                <option value="disabled">Disabled (Manual Backup Only)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                {backupSchedule === 'disabled' 
                  ? 'Automatic backup schedule is currently disabled.' 
                  : `System will create a backup every ${backupSchedule === 'daily' ? '24 hours' : backupSchedule === 'weekly' ? '7 days' : '30 days'}.`}
              </p>
            </div>

            {/* 2. Format */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Format:</span>
              </label>
              <select
                value={backupFormat}
                onChange={(e) => setBackupFormat(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="xlsx">Excel Workbook (.xlsx)</option>
                <option value="json">JSON (Full Database Snapshot)</option>
                <option value="csv">Comma Separated (.csv)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                JSON format provides the fastest database restoration.
              </p>
            </div>

            {/* 3. Destination */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Save className="w-4 h-4 text-emerald-600" />
                <span>Target Storage:</span>
              </label>
              <select
                value={backupDestination}
                onChange={(e) => setBackupDestination(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="download">Auto Browser Download</option>
                <option value="vault">Local Storage System Vault</option>
                <option value="cloud">Cloud Storage / Dropbox Vault</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Select where backup files will be saved.
              </p>
            </div>
          </div>

          {/* Last Backup Status Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  Last Backup Status: {lastBackupTime ? `Completed on ${lastBackupTime}` : 'No backups created yet.'}
                </span>
                <span className="text-[11px] text-emerald-700">
                  Total Active Records: {pos.length} Purchase Orders | Auto Schedule: <strong className="uppercase">{backupSchedule}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBackupNow}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition cursor-pointer self-start sm:self-auto"
            >
              Execute Backup
            </button>
          </div>

          {/* Database Restore Section */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-blue-600" />
              Restore Database from Backup JSON File:
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUploadRestore}
                className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400">Upload a previously exported JSON backup snapshot.</span>
            </div>
            {restoreMessage && (
              <div className="p-3 bg-slate-900 text-white text-xs rounded-xl font-mono">
                {restoreMessage}
              </div>
            )}
          </div>

          {/* Backup Log History */}
          {backupHistory.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                Recent Backup Logs History:
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px]">
                    <tr>
                      <th className="p-2">Timestamp</th>
                      <th className="p-2">Records Count</th>
                      <th className="p-2">Format</th>
                      <th className="p-2 text-right">Estimated Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {backupHistory.map((item, idx) => (
                      <tr key={item.id ? `${item.id}-${idx}` : `hist-${idx}`} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-700">{item.time}</td>
                        <td className="p-2 font-bold text-slate-900">{item.count} POs</td>
                        <td className="p-2 font-mono text-indigo-700">{item.format}</td>
                        <td className="p-2 text-right font-mono text-slate-500">{item.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
