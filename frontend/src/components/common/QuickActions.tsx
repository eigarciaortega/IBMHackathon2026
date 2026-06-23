import { useState } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { RechargeForm } from '../features/RechargeForm';
import { TransferForm } from '../features/TransferForm';

export const QuickActions = () => {
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  return (
    <>
      <div className="flex gap-4">
        <Button
          variant="primary"
          onClick={() => setIsRechargeModalOpen(true)}
          className="flex-1"
        >
          <Plus className="h-5 w-5 mr-2" />
          Recargar Saldo
        </Button>
        <Button
          variant="secondary"
          onClick={() => setIsTransferModalOpen(true)}
          className="flex-1"
        >
          <ArrowUpRight className="h-5 w-5 mr-2" />
          Transferir
        </Button>
      </div>

      <Modal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
        title="Recargar Saldo"
      >
        <RechargeForm onSuccess={() => setIsRechargeModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transferir Dinero"
      >
        <TransferForm onSuccess={() => setIsTransferModalOpen(false)} />
      </Modal>
    </>
  );
};

// Made with Bob
