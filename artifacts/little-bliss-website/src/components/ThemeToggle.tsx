import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Always default to white/light theme on initial visit or refresh
    document.documentElement.classList.remove('dark');
    setIsDark(false);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const nextDark = html.classList.toggle('dark');
    setIsDark(nextDark);
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title={isDark ? 'Switch to light mode' : 'Preview dark mode'}
      className="grid h-11 w-11 place-items-center rounded-full border border-ink/12 bg-surface text-ink transition-colors hover:border-berry hover:bg-berry hover:text-cream"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
