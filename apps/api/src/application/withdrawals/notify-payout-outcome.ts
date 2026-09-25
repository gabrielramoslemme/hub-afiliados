import { MailTemplateEnum, WithdrawalStatusEnum } from '@porto/contracts';
import { maskPixKey } from '@Domain/affiliates/pix-key.util';
import { LinkBuilder } from '@Domain/notifications/link-builder';
import { Mailer } from '@Domain/notifications/mailer';
import { formatCentsAsBRL } from '@Domain/shared/money.util';
import { WithdrawalWithAffiliate } from '@Domain/withdrawals/withdrawal.entity';

/*
  A falha não tem e-mail: ela acontece na hora do pedido, com a pessoa olhando
  a tela. Pago e devolvido chegam depois, por fora — é quando o e-mail é o
  único jeito de ela saber.
*/
const TEMPLATE_BY_STATUS: Partial<Record<WithdrawalStatusEnum, MailTemplateEnum>> = {
  [WithdrawalStatusEnum.PAID]: MailTemplateEnum.WITHDRAWAL_PAID,
  [WithdrawalStatusEnum.RETURNED]: MailTemplateEnum.WITHDRAWAL_RETURNED,
};

/** O aviso ao afiliado depois de um desfecho aplicado — o webhook e a reconciliação avisam igual. */
export async function notifyPayoutOutcome(
  mailer: Mailer,
  linkBuilder: LinkBuilder,
  withdrawal: WithdrawalWithAffiliate,
): Promise<void> {
  const template = TEMPLATE_BY_STATUS[withdrawal.status];
  if (!template) return;

  await mailer.send({
    template,
    to: withdrawal.affiliate.email,
    toName: withdrawal.affiliate.name,
    variables: {
      name: withdrawal.affiliate.name,
      amount: formatCentsAsBRL(withdrawal.amountCents),
      maskedPixKey: maskPixKey(withdrawal.pixKeyType, withdrawal.pixKey),
      link: linkBuilder.walletLink(),
    },
  });
}
