'use client';
import { useEffect } from 'react';
import { initializeFrame } from '@/lib/frame';

/**
 * Component to initialize Farcaster Frame on client side
 */
export function FrameInit() {
  useEffect(() => {
    initializeFrame();
  }, []);
  return null;
}