import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../theme/useTheme'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className="grid size-11 place-items-center rounded-xl border-2 border-black bg-white transition hover:-translate-y-0.5 dark:border-white dark:bg-neutral-900"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}

export default ThemeToggle