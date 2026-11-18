import { cn } from '../../utils/cn'

/**
 * ORVIA assets live in /public so they can also be used by the favicon and
 * social metadata without duplicating the source image.
 */
export function OrviaMark({ className, alt = '' }) {
  return (
    <img
      src="/orvia-mark.webp"
      alt={alt}
      draggable={false}
      className={cn('shrink-0 object-contain', className)}
    />
  )
}

export function OrviaWordmark({ className, alt = 'ORVIA' }) {
  return (
    <img
      src="/orvia-wordmark.webp"
      alt={alt}
      draggable={false}
      className={cn('w-auto object-contain', className)}
    />
  )
}

export function OrviaLogo({
  className,
  markClassName = 'h-32 w-32',
  wordmarkClassName = 'h-8',
}) {
  return (
    <span className={cn('flex flex-col items-center gap-3', className)}>
      <OrviaMark
        className={cn(
          'rounded-[28px] shadow-sm ring-1 ring-primary/10',
          markClassName,
        )}
      />
      <OrviaWordmark className={wordmarkClassName} />
    </span>
  )
}
