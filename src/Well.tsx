import { useLongPress } from './useLongPress';
import type { WellState } from './types';

interface Props {
  id: string;
  state: WellState;
  onTap: (id: string) => void;
  onLongPress: (id: string) => void;
}

export function Well({ id, state, onTap, onLongPress }: Props) {
  const handlers = useLongPress(
    () => onTap(id),
    () => onLongPress(id),
  );
  const hasNote = state.note.trim().length > 0;

  return (
    <button
      type="button"
      className={`well well--${state.colour}`}
      aria-label={`${id}, ${state.colour}${hasNote ? ', has note' : ''}`}
      title={hasNote ? state.note : undefined}
      {...handlers}
    >
      <span className="well__label">{id}</span>
      {hasNote && <span className="well__note-dot" aria-hidden="true" />}
    </button>
  );
}
