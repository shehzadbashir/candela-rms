import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Modal from '@/components/Common/Modal';
import { HiCash, HiCreditCard, HiQrcode } from 'react-icons/hi';

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onConfirm: (paymentMethod: string) => void;
  isProcessing: boolean;
}

export default function PaymentModal({ total, onClose, onConfirm, isProcessing }: PaymentModalProps) {
  const { t } = useTranslation('common');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState(total);
  const [change, setChange] = useState(0);

  const paymentMethods = [
    { id: 'CASH', name: t('pos.cash'), icon: HiCash },
    { id: 'CARD', name: t('pos.card'), icon: HiCreditCard },
    { id: 'MOBILE_PAYMENT', name: t('pos.mobilePayment'), icon: HiQrcode },
  ];

  const handleAmountChange = (value: string) => {
    const paid = parseFloat(value) || 0;
    setAmountPaid(paid);
    setChange(Math.max(0, paid - total));
  };

  const handleConfirm = () => {
    onConfirm(paymentMethod);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('pos.payment')} size="md">
      <div className="space-y-6">
        {/* Total Amount */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('pos.totalAmount')}</p>
          <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            Rs. {total.toLocaleString()}
          </p>
        </div>

        {/* Payment Methods */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('pos.selectPaymentMethod')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`p-3 border rounded-lg flex flex-col items-center space-y-1 transition-colors ${
                  paymentMethod === method.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <method.icon className="h-5 w-5" />
                <span className="text-xs">{method.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cash Payment Details */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('pos.amountPaid')}
              </label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                min={total}
                step="0.01"
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('pos.change')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                Rs. {change.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || (paymentMethod === 'CASH' && amountPaid < total)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? t('common.processing') : t('pos.completePayment')}
          </button>
        </div>
      </div>
    </Modal>
  );
}