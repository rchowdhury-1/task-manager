'use client';

import { useEffect } from 'react';

export default function ListsPage() {
  useEffect(() => { document.title = 'Lists · Personal OS'; }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-display">Lists</h1>
      <p className="text-secondary mt-2">
        Coming soon — Phase 4.
      </p>
    </div>
  );
}
