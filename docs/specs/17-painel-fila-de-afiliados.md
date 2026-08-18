# Spec 17 — Painel: fila de afiliados, detalhe e decisão

**Issue:** SIS-519 · **RF:** RF-06, RF-07 · **Depende de:** 16, 15

**Entrega:** menu "Afiliados" com a lista pedida na SIS-519, busca por nome, filtro por status, tela de detalhe com a trilha auditável e as ações de aprovar e reprovar.

Texto da issue: *"No painel, haverá um menu 'Afiliados' onde serão listados todos os cadastros realizados e seus status. Exibir: Nome, Email, CPF, Status, Data de criação. Nessa tela deve ser possível aprovar a criação desse usuário. Nessa tela deve ser possível buscar um usuário da lista, por nome."*

**Files:**
- Create: `apps/painel/src/resources/affiliates/list.tsx`, `.../show.tsx`, `.../status-tag.tsx`, `.../decision-actions.tsx`, `.../history-timeline.tsx`
- Create: `apps/painel/src/app/(painel)/afiliados/page.tsx`, `.../afiliados/[publicId]/page.tsx`
- Modify: `apps/painel/src/core/providers/refine-provider.tsx` (registro do recurso)

**Interfaces:**
- Consumes: `AffiliateListItem`, `AffiliateDetail`, `AffiliateStatusHistoryItem`, `AffiliateStatusEnum`, `PixKeyTypeEnum`, `rejectAffiliateSchema` de `@porto/contracts`; rotas `/v1/admin/affiliates*` (Specs 14 e 15); `apiClient` (Spec 03).
- Produces: recurso Refine `affiliates` com rotas `list` (`/afiliados`) e `show` (`/afiliados/:publicId`).

---

- [ ] **Step 1: Registrar o recurso no Refine**

Em `refine-provider.tsx`, adicione ao `<Refine>`:

```tsx
  resources={[
    {
      name: 'affiliates',
      list: '/afiliados',
      show: '/afiliados/:id',
      meta: { label: 'Afiliados', icon: <TeamOutlined /> },
    },
  ]}
```

Importe `TeamOutlined` de `@ant-design/icons`. O `dataProvider` da Spec 03 já traduz `affiliates` para `/admin/affiliates`.

- [ ] **Step 2: Escrever o componente de status**

`apps/painel/src/resources/affiliates/status-tag.tsx`:

```tsx
import { Tag } from 'antd';
import { AffiliateStatusEnum } from '@porto/contracts';

const CONFIG: Record<AffiliateStatusEnum, { color: string; label: string }> = {
  [AffiliateStatusEnum.PENDING_APPROVAL]: { color: 'gold', label: 'Em análise' },
  [AffiliateStatusEnum.APPROVED]: { color: 'green', label: 'Aprovado' },
  [AffiliateStatusEnum.REJECTED]: { color: 'red', label: 'Reprovado' },
  [AffiliateStatusEnum.SUSPENDED]: { color: 'default', label: 'Suspenso' },
};

export function StatusTag({ status }: { status: AffiliateStatusEnum }): JSX.Element {
  const { color, label } = CONFIG[status];
  return <Tag color={color}>{label}</Tag>;
}
```

- [ ] **Step 3: Escrever a lista**

`apps/painel/src/resources/affiliates/list.tsx`:

```tsx
'use client';

import { List, ShowButton, useTable } from '@refinedev/antd';
import { Input, Select, Space, Table } from 'antd';
import { useState } from 'react';
import { AffiliateStatusEnum, type AffiliateListItem } from '@porto/contracts';
import { StatusTag } from './status-tag';

const STATUS_OPTIONS = [
  { value: AffiliateStatusEnum.PENDING_APPROVAL, label: 'Em análise' },
  { value: AffiliateStatusEnum.APPROVED, label: 'Aprovado' },
  { value: AffiliateStatusEnum.REJECTED, label: 'Reprovado' },
  { value: AffiliateStatusEnum.SUSPENDED, label: 'Suspenso' },
];

export function AffiliateList(): JSX.Element {
  const [search, setSearch] = useState('');

  const { tableProps, setFilters } = useTable<AffiliateListItem>({
    resource: 'affiliates',
    sorters: { initial: [{ field: 'createdAt', order: 'desc' }] },
    syncWithLocation: true,
  });

  const applySearch = (value: string): void => {
    setSearch(value);
    setFilters([{ field: 'search', operator: 'contains', value: value || undefined }], 'replace');
  };

  const applyStatus = (value?: AffiliateStatusEnum): void => {
    setFilters([{ field: 'status', operator: 'eq', value }], 'merge');
  };

  return (
    <List title="Afiliados">
      <Space className="mb-4" wrap>
        <Input.Search
          allowClear
          placeholder="Buscar por nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onSearch={applySearch}
          style={{ width: 280 }}
        />
        <Select
          allowClear
          placeholder="Todos os status"
          options={STATUS_OPTIONS}
          onChange={applyStatus}
          style={{ width: 200 }}
        />
      </Space>

      <Table {...tableProps} rowKey="publicId">
        <Table.Column dataIndex="name" title="Nome" sorter />
        <Table.Column dataIndex="email" title="E-mail" />
        <Table.Column dataIndex="maskedCpf" title="CPF" />
        <Table.Column
          dataIndex="status"
          title="Status"
          sorter
          render={(status: AffiliateStatusEnum) => <StatusTag status={status} />}
        />
        <Table.Column
          dataIndex="createdAt"
          title="Cadastro"
          sorter
          render={(value: string) => new Date(value).toLocaleDateString('pt-BR')}
        />
        <Table.Column<AffiliateListItem>
          title="Ações"
          render={(_, record) => <ShowButton hideText recordItemId={record.publicId} />}
        />
      </Table>
    </List>
  );
}
```

> O CPF vem mascarado da API. O painel **não** tem como exibir o completo na lista, e é assim de propósito.

- [ ] **Step 4: Escrever as ações de decisão**

`apps/painel/src/resources/affiliates/decision-actions.tsx`:

```tsx
'use client';

import { useInvalidate, useNotification } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Popconfirm, Space } from 'antd';
import { useState } from 'react';
import { rejectAffiliateSchema, type RejectAffiliateRequest } from '@porto/contracts';
import { ApiError, apiClient } from '@/core/http/api-client';

interface Props {
  publicId: string;
  affiliateName: string;
}

export function DecisionActions({ publicId, affiliateName }: Props): JSX.Element {
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RejectAffiliateRequest>({
    resolver: zodResolver(rejectAffiliateSchema),
  });

  const refresh = (): void => {
    void invalidate({ resource: 'affiliates', invalidates: ['list', 'detail'], id: publicId });
    // A trilha vive fora do dataProvider (ver show.tsx), então precisa ser
    // invalidada à parte — senão a decisão que acabou de acontecer não aparece.
    void queryClient.invalidateQueries({ queryKey: ['affiliates', publicId, 'history'] });
  };

  const handleError = (error: unknown): void => {
    const message = error instanceof ApiError ? error.message : 'Não foi possível concluir a ação.';
    open?.({ type: 'error', message: 'Erro', description: message });
  };

  const approve = async (): Promise<void> => {
    setLoading(true);
    try {
      await apiClient(`/admin/affiliates/${publicId}/approve`, { method: 'POST' });
      open?.({
        type: 'success',
        message: 'Cadastro aprovado',
        description: `${affiliateName} recebeu por e-mail o link para criar a senha.`,
      });
      refresh();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const reject = handleSubmit(async (values) => {
    setLoading(true);
    try {
      await apiClient(`/admin/affiliates/${publicId}/reject`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      open?.({ type: 'success', message: 'Cadastro reprovado', description: 'A devolutiva foi enviada por e-mail.' });
      setRejecting(false);
      reset();
      refresh();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  });

  return (
    <Space>
      <Popconfirm
        title="Aprovar este cadastro?"
        description="O afiliado receberá um e-mail com o link para criar a senha."
        okText="Aprovar"
        cancelText="Cancelar"
        onConfirm={approve}
      >
        <Button type="primary" loading={loading}>Aprovar</Button>
      </Popconfirm>

      <Button danger onClick={() => setRejecting(true)}>Reprovar</Button>

      <Modal
        open={rejecting}
        title="Reprovar cadastro"
        okText="Confirmar reprovação"
        cancelText="Cancelar"
        confirmLoading={loading}
        onOk={() => void reject()}
        onCancel={() => { setRejecting(false); reset(); }}
      >
        <p className="mb-2 text-sm text-slate-600">
          O motivo fica registrado na trilha de auditoria e é enviado ao afiliado.
        </p>
        <Input.TextArea {...register('reason')} rows={4} maxLength={500} showCount />
        {errors.reason && <span className="text-xs text-red-600">{errors.reason.message}</span>}
      </Modal>
    </Space>
  );
}
```

> A confirmação na aprovação não é ceremônia: ela dispara e-mail ao afiliado e, na onda 2, vai criar o cupom na Porto. Ação irreversível pede confirmação.

- [ ] **Step 5: Escrever a trilha**

`apps/painel/src/resources/affiliates/history-timeline.tsx`:

```tsx
'use client';

import { Empty, Timeline } from 'antd';
import { AffiliateStatusEnum, type AffiliateStatusHistoryItem } from '@porto/contracts';

const LABEL: Record<AffiliateStatusEnum, string> = {
  [AffiliateStatusEnum.PENDING_APPROVAL]: 'Cadastro enviado',
  [AffiliateStatusEnum.APPROVED]: 'Cadastro aprovado',
  [AffiliateStatusEnum.REJECTED]: 'Cadastro reprovado',
  [AffiliateStatusEnum.SUSPENDED]: 'Cadastro suspenso',
};

const COLOR: Record<AffiliateStatusEnum, string> = {
  [AffiliateStatusEnum.PENDING_APPROVAL]: 'gold',
  [AffiliateStatusEnum.APPROVED]: 'green',
  [AffiliateStatusEnum.REJECTED]: 'red',
  [AffiliateStatusEnum.SUSPENDED]: 'gray',
};

export function HistoryTimeline({ entries }: { entries: AffiliateStatusHistoryItem[] }): JSX.Element {
  if (entries.length === 0) return <Empty description="Sem histórico" />;

  return (
    <Timeline
      items={entries.map((entry) => ({
        color: COLOR[entry.toStatus],
        children: (
          <div>
            <strong>{LABEL[entry.toStatus]}</strong>
            <div className="text-xs text-slate-500">
              {new Date(entry.createdAt).toLocaleString('pt-BR')}
              {entry.actorName ? ` · ${entry.actorName}` : ' · pelo próprio afiliado'}
            </div>
            {entry.reason && <div className="mt-1 text-sm text-slate-700">{entry.reason}</div>}
          </div>
        ),
      }))}
    />
  );
}
```

- [ ] **Step 6: Escrever o detalhe**

`apps/painel/src/resources/affiliates/show.tsx`:

```tsx
'use client';

import { Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { Card, Descriptions, Space } from 'antd';
import {
  AffiliateStatusEnum, PixKeyTypeEnum,
  type AffiliateDetail, type AffiliateStatusHistoryItem,
} from '@porto/contracts';
import { apiClient } from '@/core/http/api-client';
import { DecisionActions } from './decision-actions';
import { HistoryTimeline } from './history-timeline';
import { StatusTag } from './status-tag';

const PIX_LABEL: Record<PixKeyTypeEnum, string> = {
  [PixKeyTypeEnum.EMAIL]: 'E-mail',
  [PixKeyTypeEnum.PHONE]: 'Telefone',
  [PixKeyTypeEnum.CPF]: 'CPF',
};

export function AffiliateShow({ publicId }: { publicId: string }): JSX.Element {
  const { query } = useShow<AffiliateDetail>({ resource: 'affiliates', id: publicId });
  const affiliate = query.data?.data;

  // A trilha não é um recurso REST do Refine — é uma subrota. Buscá-la com
  // `useOne` faria o dataProvider montar `/affiliates/{id}/history/`, com barra
  // sobrando. React Query direto é mais honesto e mais simples.
  const { data: history } = useQuery<AffiliateStatusHistoryItem[]>({
    queryKey: ['affiliates', publicId, 'history'],
    queryFn: () => apiClient<AffiliateStatusHistoryItem[]>(`/admin/affiliates/${publicId}/history`),
    enabled: Boolean(affiliate),
  });

  return (
    <Show
      isLoading={query.isLoading}
      title={affiliate?.name ?? 'Afiliado'}
      headerButtons={
        affiliate?.status === AffiliateStatusEnum.PENDING_APPROVAL ? (
          <DecisionActions publicId={publicId} affiliateName={affiliate.name} />
        ) : null
      }
    >
      <Space direction="vertical" size="large" className="w-full">
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Status">
            {affiliate && <StatusTag status={affiliate.status} />}
          </Descriptions.Item>
          <Descriptions.Item label="Cadastro em">
            {affiliate && new Date(affiliate.createdAt).toLocaleString('pt-BR')}
          </Descriptions.Item>
          <Descriptions.Item label="E-mail">{affiliate?.email}</Descriptions.Item>
          <Descriptions.Item label="CPF">{affiliate?.cpf}</Descriptions.Item>
          <Descriptions.Item label="Tipo da chave PIX">
            {affiliate && PIX_LABEL[affiliate.pixKeyType]}
          </Descriptions.Item>
          <Descriptions.Item label="Chave PIX">{affiliate?.pixKey}</Descriptions.Item>
          <Descriptions.Item label="Termos aceitos">
            {affiliate && `versão ${affiliate.termsVersion} em ${new Date(affiliate.termsAcceptedAt).toLocaleString('pt-BR')}`}
          </Descriptions.Item>
          <Descriptions.Item label="Decisão">
            {affiliate?.approvedByName
              ? `${affiliate.approvedByName} em ${new Date(affiliate.approvedAt!).toLocaleString('pt-BR')}`
              : (affiliate?.rejectionReason ?? 'Pendente')}
          </Descriptions.Item>
        </Descriptions>

        <Card title="Trilha de auditoria">
          <HistoryTimeline entries={history ?? []} />
        </Card>
      </Space>
    </Show>
  );
}
```

> As ações só aparecem quando o status é `PENDING_APPROVAL`. A API também recusa decisão repetida (`DECISION_ALREADY_TAKEN`) — a tela evita o erro, a API garante a regra.

- [ ] **Step 7: Ligar as páginas**

`apps/painel/src/app/(painel)/afiliados/page.tsx`:

```tsx
import { AffiliateList } from '@/resources/affiliates/list';

export default function AfiliadosPage(): JSX.Element {
  return <AffiliateList />;
}
```

`apps/painel/src/app/(painel)/afiliados/[publicId]/page.tsx`:

```tsx
import { AffiliateShow } from '@/resources/affiliates/show';

export default async function AfiliadoPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<JSX.Element> {
  const { publicId } = await params;
  return <AffiliateShow publicId={publicId} />;
}
```

- [ ] **Step 8: Verificar o ciclo completo na tela**

Com API e painel rodando, e ao menos dois cadastros criados via `POST /v1/mobile/affiliates`:

1. `/afiliados` lista os cadastros com nome, e-mail, CPF mascarado, status e data. ✓
2. Buscar por parte do nome filtra a lista. ✓
3. Filtrar por "Em análise" mostra só os pendentes. ✓
4. Abrir o detalhe mostra CPF completo, chave PIX e o aceite de termos com versão e data. ✓
5. Aprovar pede confirmação, mostra sucesso e o status vira "Aprovado"; o link de senha aparece no log da API. ✓
6. Reprovar exige motivo com 10 caracteres ou mais e registra o texto na trilha. ✓
7. Depois da decisão, os botões somem. ✓
8. Recarregar o detalhe mostra a trilha com as duas entradas, com autor e data. ✓

- [ ] **Step 9: Verificar tipos, lint e commitar**

```bash
npm run type-check --workspace apps/painel
npm run lint
npm run build --workspace apps/painel
git add apps/painel
git commit -m "feat(painel): add affiliate approval queue with search, detail and decision actions"
```
