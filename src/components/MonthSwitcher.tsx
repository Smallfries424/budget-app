import { useMonth } from '../hooks/useMonth'

/** Prev / month label / next. Tapping the label jumps back to this month. */
export default function MonthSwitcher() {
  const { label, isCurrent, prev, next, goCurrent } = useMonth()
  return (
    <div className="flex items-center gap-0.5 text-sm">
      <button
        onClick={prev}
        aria-label="Previous month"
        className="px-2 py-1 text-lg leading-none text-slate-400"
      >
        &lsaquo;
      </button>
      <button
        onClick={goCurrent}
        disabled={isCurrent}
        className={`min-w-[7rem] text-center font-medium ${
          isCurrent
            ? 'text-slate-500'
            : 'text-slate-900 underline underline-offset-2 dark:text-white'
        }`}
      >
        {label}
      </button>
      <button
        onClick={next}
        aria-label="Next month"
        className="px-2 py-1 text-lg leading-none text-slate-400"
      >
        &rsaquo;
      </button>
    </div>
  )
}
