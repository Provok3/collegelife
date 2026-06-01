'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

export function ThemeModeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className={cn(
          'h-9 w-full max-w-xs rounded-lg bg-muted animate-pulse',
          className,
        )}
        aria-hidden
      />
    )
  }

  const activeTheme = theme === 'system' ? resolvedTheme : theme

  return (
    <ToggleGroup
      type="single"
      value={activeTheme ?? 'dark'}
      onValueChange={(value) => {
        if (value) setTheme(value)
      }}
      className={cn('grid w-full max-w-xs grid-cols-2', className)}
      variant="outline"
    >
      <ToggleGroupItem
        value="light"
        aria-label="Light mode"
        className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Sun className="size-4" />
        Light
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        aria-label="Dark mode"
        className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Moon className="size-4" />
        Dark
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
