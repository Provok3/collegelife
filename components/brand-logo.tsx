import Image from 'next/image'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type BrandLogoProps = Omit<ComponentProps<typeof Image>, 'src' | 'alt'> & {
  alt?: string
}

export function BrandLogo({
  alt = 'CollegeLife Logo',
  className,
  ...props
}: BrandLogoProps) {
  return (
    <>
      <Image
        src="/logo.png"
        alt={alt}
        className={cn(className, 'dark:hidden')}
        {...props}
      />
      <Image
        src="/logo-dark.png"
        alt={alt}
        className={cn(className, 'hidden dark:block')}
        {...props}
      />
    </>
  )
}
