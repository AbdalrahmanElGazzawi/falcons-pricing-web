'use client';
import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';

export function ShareLinkBox({ token }: { token: string }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);
  const url = `${origin}/client/${token}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card card-p">
      <div className="text-xs text-label uppercase tracking-wide mb-3">Client share link</div>
      <p className="text-xs text-mute mb-3">
        This link lets the client view the quote and approve / reject. No login required.
      </p>
      <div className="flex items-center gap-2">
        <input readOnly value={url} className="input text-xs flex-1" />
        <button onClick={copy} className="btn btn-ghost text-xs px-3">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <a href={`/client/${token}`} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs px-3">
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
