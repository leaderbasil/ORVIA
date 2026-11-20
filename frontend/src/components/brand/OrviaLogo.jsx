import { cn } from '../../utils/cn'

/**
 * ORVIA assets live in /public so they can also be used by the favicon and
 * social metadata without duplicating the source image.
 */
export function OrviaMark({ className, alt = '' }) {
  return (
    <>
      {/* Light theme icon - Glossy Purple version */}
      <img
        src="/Glossy%20Purple%20ORVIA%20Shopping%20App%20Icon.png"
        alt={alt}
        draggable={false}
        className={cn('shrink-0 object-contain dark:hidden', className)}
      />
      {/* Dark theme icon - Neon Purple version */}
      <img
        src="/Neon%20Purple%20ORVIA%20Shopping%20Icon.png"
        alt={alt}
        draggable={false}
        className={cn('shrink-0 object-contain hidden dark:block', className)}
      />
    </>
  )
}

export function OrviaWordmark({ className, alt = 'ORVIA' }) {
  return (
    <img
      src="/Glossy%20Purple%20ORVIA%20Shopping%20App%20Icon.png"
      alt={alt}
      draggable={false}
      className={cn('w-auto object-contain', className)}
    />
  )
}

export function OrviaLogo({
  className,
  markClassName = 'h-32 w-32',
}) {
  return (
    <span className={cn('flex items-center justify-center', className)}>
      <OrviaMark
        className={cn(
          'rounded-[28px] shadow-sm ring-1 ring-primary/10',
          markClassName,
        )}
      />
    </span>
  )
}
