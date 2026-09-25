import { ApiProperty } from '@nestjs/swagger';
import {
  AffiliateAuditLogItem,
  AuditChangeTypeEnum,
  AuditEntityEnum,
  UserTypeEnum,
} from '@porto/contracts';
import { AffiliateAuditLogOutput } from '@Application/affiliates/list-affiliate-audit-logs.use-case';

export class AffiliateAuditLogResponseDto implements AffiliateAuditLogItem {
  @ApiProperty({ enum: AuditEntityEnum })
  entity: AuditEntityEnum;

  @ApiProperty({ enum: AuditChangeTypeEnum })
  changeType: AuditChangeTypeEnum;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { status: { from: 'PENDING_APPROVAL', to: 'APPROVED' } },
    description: 'O antes e o depois de cada campo que mudou',
  })
  diff: Record<string, { from: unknown; to: unknown }>;

  @ApiProperty({ nullable: true })
  justification: string | null;

  @ApiProperty({ nullable: true, description: 'Nulo quando ninguém agiu pela sessão' })
  actorName: string | null;

  @ApiProperty({ enum: UserTypeEnum, nullable: true })
  actorType: UserTypeEnum | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  static from(output: AffiliateAuditLogOutput): AffiliateAuditLogResponseDto {
    return { ...output, createdAt: output.createdAt.toISOString() };
  }
}
