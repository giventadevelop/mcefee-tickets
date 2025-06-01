'use client';
import React, { useState } from 'react';

export function TeamImage({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [imgSrc, setImgSrc] = useState(src);
  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc('/images/about-us.jpg')}
      {...props}
    />
  );
}