'use client';

import Image from 'next/image';

interface SmartImageProps {
  src: string;
  alt: string;
  /** Required for next/image to pick the right srcset entry. */
  sizes: string;
  className?: string;
  priority?: boolean;
}

/**
 * Fill-mode next/image wrapper for container-driven layouts (parent must be
 * `position: relative` with explicit dimensions). Legacy rows can still hold
 * base64 data URLs, which the image optimizer rejects, so those fall back to
 * a plain <img>.
 */
export default function SmartImage({ src, alt, sizes, className = '', priority = false }: SmartImageProps) {
  if (src.startsWith('data:')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`absolute inset-0 w-full h-full object-cover ${className}`} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );
}
