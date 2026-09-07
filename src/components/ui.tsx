import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 ${className}`}
    >
      {children}
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const styles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900',
    ghost:
      'bg-transparent text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  }[variant]
  return (
    <button
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputBase =
  'w-full rounded-xl border-0 bg-slate-100 px-3 py-2.5 text-base text-slate-900 outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputBase} {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputBase} {...props} />
}

export function Money({
  value,
  className = '',
}: {
  value: string
  className?: string
}) {
  return <span className={`tabular-nums ${className}`}>{value}</span>
}
