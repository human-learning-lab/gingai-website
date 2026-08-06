'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Timeline from '@/components/Timeline/Timeline';
import { getBlocks } from '@/data/blocks';

export default function Dashboard() {
	return (
	<>
	{/* Mobile layout — inline expansion, no tabs */}
	<div className="mob-only mob-backbone">
	<div style={{ padding: '0 0 4px' }}>
	</div>
	<div className="mob-bb-tl">
	</div>
	</div>

	{/* Desktop layout */}
	<div className="desk-only" style={{ display: 'contents' }}>
	<div className="main">
		<div className="block-view on">
		</div>
	</div>
	</div>
	</>
	);
}
