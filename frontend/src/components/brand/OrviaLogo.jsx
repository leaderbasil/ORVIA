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

export function OrviaLogo({ className, alt = 'ORVIA' }) {
  return (
    <img
      src="/orvia-logo.webp"
      alt={alt}
      draggable={false}
      className={cn('object-contain', className)}
    />
  )
}
