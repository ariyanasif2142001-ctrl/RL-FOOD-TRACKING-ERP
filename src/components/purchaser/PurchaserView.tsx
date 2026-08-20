import React from 'react';
import { PurchaseOrder, POItem, User } from '../../types';
import { RunningPoList } from '../RunningPoList';

interface PurchaserViewProps {
  pos: PurchaseOrder[];
  currentUser: User;
  onHoldItem?: (itemId: string) => { success: boolean; message: string };
  onReleaseHold?: (itemId: string) => { success: boolean; message: string };
  onRecordPurchase?: (itemId: string, purchasedQty: number, notes: string) => { success: boolean; message: string };
  onReturnItem?: (itemId: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  onHoldPO?: (poNumber: string) => void;
  onReleasePO?: (poNumber: string) => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export const PurchaserView: React.FC<PurchaserViewProps> = ({
  pos,
  currentUser,
  onHoldPO,
  onReleasePO,
  onSync,
  isSyncing
}) => {
  return (
    <div className="space-y-4">
      {/* Running PO List */}
      <RunningPoList
        pos={pos}
        allowDelete={false}
        allowStatusChange={false}
        allowDeptChart={false}
        onHoldPO={onHoldPO}
        onReleasePO={onReleasePO}
      />
    </div>
  );
};
