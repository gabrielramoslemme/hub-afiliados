'use client';

import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  type ScreenReaderInstructions,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/cn';
import { moveItem, positionAnnouncement } from '../lib/reorder';
import type { SaveMaterialResult } from '../lib/save-result';

interface SortableItem {
  id: string;
  title: string;
}

interface SortableListProps<T extends SortableItem> {
  items: T[];
  /** O que a alça anuncia: "Reordenar Módulo 1 - Porto Serviço". */
  onReorder: (ids: string[]) => Promise<SaveMaterialResult<never>>;
  renderItem: (item: T, index: number) => ReactNode;
}

const INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    'Para reordenar, pressione espaço ou enter para pegar o item, use as setas para cima e para baixo para movê-lo e pressione espaço ou enter de novo para soltar. Esc cancela.',
};

/**
 * A lista que se reorganiza arrastando pela alça — com o mouse, o toque ou o
 * teclado. A ordem muda na tela na hora e vai inteira para a API; se ela
 * recusar, a tela volta à ordem de antes e diz por quê.
 */
export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
}: SortableListProps<T>) {
  const router = useRouter();
  // Sem id próprio, o dnd-kit numera o `aria-describedby` por um contador
  // global: com duas listas na tela, servidor e cliente contam diferente e a
  // hidratação reclama.
  const dndId = useId();
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState(() => items.map((item) => item.id));

  // O servidor é a fonte da verdade: item criado, apagado ou reordenado em
  // outra aba chega pelo `router.refresh()` e substitui a ordem local.
  const serverOrder = items.map((item) => item.id).join(',');
  useEffect(() => {
    setOrder(serverOrder ? serverOrder.split(',') : []);
  }, [serverOrder]);

  const sensors = useSensors(
    // Os 6px deixam o clique na alça continuar sendo clique, e não um arrasto de zero.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = new Map(items.map((item) => [item.id, item]));
  const titleOf = (id: string | number) => byId.get(String(id))?.title ?? 'Item';

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `${titleOf(active.id)} selecionado. ${positionAnnouncement(titleOf(active.id), order.indexOf(String(active.id)), order.length)}`,
    onDragOver: ({ active, over }) =>
      over
        ? positionAnnouncement(titleOf(active.id), order.indexOf(String(over.id)), order.length)
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${titleOf(active.id)} solto na posição ${order.indexOf(String(over.id)) + 1} de ${order.length}.`
        : `${titleOf(active.id)} solto fora da lista. A ordem não mudou.`,
    onDragCancel: ({ active }) => `Reordenação cancelada. ${titleOf(active.id)} voltou ao lugar.`,
  };

  function onDragEnd({ active, over }: DragEndEvent) {
    const next = moveItem(order, String(active.id), over ? String(over.id) : null);
    if (!next) return;

    const previous = order;
    setOrder(next);

    startTransition(async () => {
      const result = await onReorder(next);

      if (result.status !== 'success') {
        setOrder(previous);
        toast.error(result.status === 'failed' ? result.message : 'Tente novamente.');
        return;
      }

      toast.success('Nova ordem salva.');
      router.refresh();
    });
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      accessibility={{ announcements, screenReaderInstructions: INSTRUCTIONS }}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className={cn('divide-y divide-ink-200', pending && 'opacity-70')} aria-busy={pending}>
          {order.map((id, index) => {
            const item = byId.get(id);
            if (!item) return null;

            return (
              <SortableRow key={id} id={id} title={item.title} disabled={pending}>
                {renderItem(item, index)}
              </SortableRow>
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  title,
  disabled,
  children,
}: {
  id: string;
  title: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'relative flex items-start gap-2 bg-white py-4 pr-5 pl-2',
        isDragging && 'z-10 rounded-card shadow-pop',
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${title}`}
        className="mt-1 flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-2 focus-visible:outline-blue-600 active:cursor-grabbing disabled:cursor-not-allowed"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <div className="flex min-w-0 flex-1 items-start gap-4">{children}</div>
    </li>
  );
}
