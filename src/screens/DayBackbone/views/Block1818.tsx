'use client';

import Link from 'next/link';
import { IconMic } from '@/components/Icons';
import type { CaptureBlockData } from '@/types/block-content';

interface Props {
  data: CaptureBlockData | null;
}

export default function Block1818({ data: _ }: Props) {
  return (
    <>
      <div className="main-top">
        <div className="eyebrow">18:18 · Activates at dock-in after R7</div>
        <div className="page-title">
          Capture Opens <span className="ptag ptag-r">Capture</span>
        </div>
      </div>

      <div className="gen-panel">
        <Link href="/capture" style={{ textDecoration: 'none' }}>
          <button className="capture-cta">
            <IconMic size={16} />
            Open Capture
          </button>
        </Link>
      </div>
    </>
  );
}
