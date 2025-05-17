import { MoonIcon, SunIcon } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from './ThemeProvider';

export function Header() {
  const { theme, setTheme } = useTheme();
  
  return (
    <header className="border-b  backdrop-blur-sm bg-opacity-70 dark:bg-opacity-70 sticky top-0 z-10">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M17 9.2C17 5.917 14.142 3 10.933 3a6.536 6.536 0 0 0-2.933.7" />
              <path d="M15.46 12a4.31 4.31 0 0 1 1.4 3.18c0 2.683-2.4 4.82-5.2 4.82C8.86 20 6.5 17.863 6.5 15.2c0-2.6 2.3-4.8 5-4.8" />
              <path d="M13.4 9.2c0-2.743-2.4-4.96-5.2-4.96-2.9 0-5.2 2.217-5.2 4.96 0 2.743 2.4 4.96 5.2 4.96" />
            </svg>
            <span className="font-semibold text-lg">RTSP Stream Viewer</span>
          </div>
          <div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full"
            >
              {theme === "dark" ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
