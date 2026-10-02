import { Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';

export function ThemeToggle() {
  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="grid h-11 w-11 place-items-center rounded-full border border-ink/12 bg-surface text-ink transition-colors hover:border-berry hover:bg-berry hover:text-cream"
    >
      <Sun className="hidden dark:block" size={18} />
      <Moon className="block dark:hidden" size={18} />
    </button>
  );
}
