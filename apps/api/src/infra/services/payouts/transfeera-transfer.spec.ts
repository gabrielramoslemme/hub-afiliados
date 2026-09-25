import { WithdrawalStatusEnum } from '@porto/contracts';
import { redactTransfeeraPayload, toPayoutUpdate } from './transfeera-transfer';

const EVENT = {
  id: '7d3aae40-6655-4d9a-801b-d0ab7ae906d7',
  object: 'Transfer',
  data: {
    id: 60040,
    integration_id: '40000000-0000-4000-8000-000000000001',
    status: 'FINALIZADO',
    status_description: null,
    receipt_url: 'https://cdn.transfeera.com/receipt/60040.pdf',
    pix_end2end_id: 'E1234567820260925120000000000001',
    batch_id: 1426,
    destination_bank_account: {
      name: 'Marina Ferraz',
      cpf_cnpj: '529.982.247-25',
      pix_key: 'pix.marina@email.com',
      pix_key_type: 'EMAIL',
      bank: { name: 'Banco X' },
    },
  },
};

describe('toPayoutUpdate', () => {
  it('reads a finished transfer as paid, with the receipt and the pix id', () => {
    const update = toPayoutUpdate(EVENT.data, EVENT);

    expect(update).toEqual(
      expect.objectContaining({
        reference: '40000000-0000-4000-8000-000000000001',
        status: WithdrawalStatusEnum.PAID,
        providerStatus: 'FINALIZADO',
        providerTransferId: '60040',
        endToEndId: 'E1234567820260925120000000000001',
        receiptUrl: 'https://cdn.transfeera.com/receipt/60040.pdf',
      }),
    );
  });

  it.each([
    ['DEVOLVIDO', WithdrawalStatusEnum.RETURNED],
    ['FALHA', WithdrawalStatusEnum.FAILED],
    ['CRIADA', null],
    ['RECEBIDO', null],
    ['TRANSFERIDO', null],
  ])('maps %s to %s', (status, expected) => {
    expect(toPayoutUpdate({ ...EVENT.data, status }, EVENT).status).toBe(expected);
  });

  it('keeps the provider reason for a returned transfer', () => {
    const update = toPayoutUpdate(
      { ...EVENT.data, status: 'DEVOLVIDO', status_description: 'Conta encerrada' },
      EVENT,
    );

    expect(update.failureReason).toBe('Conta encerrada');
  });
});

describe('redactTransfeeraPayload', () => {
  // A trilha guarda o corpo inteiro, e ela é lida pelo suporte: a chave e o CPF
  // do afiliado não podem ir junto.
  it('drops the pix key, the document and the holder data of the destination account', () => {
    const text = JSON.stringify(redactTransfeeraPayload(EVENT));

    expect(text).not.toContain('pix.marina@email.com');
    expect(text).not.toContain('529.982.247-25');
    expect(text).not.toContain('Marina Ferraz');
    expect(text).toContain('FINALIZADO');
  });

  it('does not touch the object it was given', () => {
    redactTransfeeraPayload(EVENT);

    expect(EVENT.data.destination_bank_account.pix_key).toBe('pix.marina@email.com');
  });
});
