import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Article } from '../../shared/types';
import type { Source } from '../lib/config';
import { SourceCard } from './SourceCard';

export interface GridItem {
  source: Source;
  articles: Article[] | undefined;
  error?: string;
}

interface Props {
  items: GridItem[];
  limit: number;
  /** Je Quelle die Zahl der zusätzlich eingeblendeten Artikel. */
  expanded: Record<string, number>;
  onMore: (sourceId: string, step: number) => void;
  onLess: (sourceId: string) => void;
  isRead: (link: string) => boolean;
  onRead: (link: string) => void;
  isSaved: (link: string) => boolean;
  onSave: (article: Article, source: Source) => void;
  now: number;
  filtered: boolean;
  showImages: boolean;
  /** Verschiebt Quelle `fromId` an die Position von `toId`. */
  onMove: (fromId: string, toId: string) => void;
}

function SortableCard({ item, extra, ...card }: { item: GridItem; extra: number } & Omit<Props, 'items' | 'expanded' | 'onMove'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.source.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? 'relative z-20 opacity-80 shadow-2xl' : undefined}
    >
      <SourceCard
        source={item.source}
        articles={item.articles}
        error={item.error}
        extra={extra}
        {...card}
        handleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function SourceGrid({ items, expanded, onMove, ...card }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.source.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <SortableCard key={item.source.id} item={item} extra={expanded[item.source.id] ?? 0} {...card} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
