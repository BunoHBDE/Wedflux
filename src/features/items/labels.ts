import type { ItemStatus } from '../../types/database';

export const STATUS_LABEL: Record<ItemStatus, string> = {
  a_decidir: 'A decidir',
  contratado: 'Contratado',
  pago: 'Pago',
  nao_se_aplica: 'Não se aplica',
};
