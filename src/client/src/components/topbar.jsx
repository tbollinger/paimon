import React from 'react';
import { useApi } from '../hooks/use-api.js';
import { formatDateTime } from '../utils/format.js';

export default function TopBar() {
  const { data: status } = useApi('/api/config/status');

  const isHealthy = status && status.last_collection_at && !status.last_collection_error;
  const dataSource = status?.data_source || 'local';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '1px solid var(--border)', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/camel_vector.svg" alt="pAImon" style={{ height: 32 }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', background: '#000000', color: '#ffffff', padding: '4px 10px', borderRadius: 6 }}>
          p<span style={{ color: '#ffd700' }}>AI</span>mon
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 16 }}>
        <span style={{
          color: 'var(--text-secondary)',
          background: '#ffffff', border: '2px solid #000000', borderRadius: 8,
          padding: '4px 12px',
        }}>
          Last update: {status?.last_collection_at ? formatDateTime(status.last_collection_at) : 'Never'}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#ffffff', border: '2px solid #000000', borderRadius: 8,
          padding: '4px 12px',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isHealthy ? 'var(--success)' : 'var(--danger)',
          }} />
          {isHealthy ? 'Healthy' : 'Error'}
        </span>
        <span style={{
          background: '#ffffff',
          padding: '4px 12px', borderRadius: 8, fontSize: 14,
          border: '2px solid #000000',
        }}>
          {dataSource === 'api' ? 'API' : 'Estimated'}
        </span>
      </div>
    </div>
  );
}
