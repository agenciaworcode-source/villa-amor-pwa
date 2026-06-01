export function PageSkeleton() {
  return (
    <div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ width: 80, height: 10, background: '#EDE0C8', borderRadius: 6, marginBottom: 10 }} />
          <div style={{ width: 220, height: 28, background: '#EDE0C8', borderRadius: 8, marginBottom: 8 }} />
          <div style={{ width: 300, height: 14, background: '#F7F0E3', borderRadius: 6 }} />
        </div>
        <div style={{ width: 120, height: 34, background: '#EDE0C8', borderRadius: 8 }} />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[80, 90, 100, 80].map((w, i) => (
          <div key={i} style={{ width: w, height: 34, background: '#F7F0E3', borderRadius: 8 }} />
        ))}
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: 'white', border: '1px solid #EDE0C8', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ width: '60%', height: 10, background: '#F7F0E3', borderRadius: 6, marginBottom: 14 }} />
            <div style={{ width: '40%', height: 36, background: '#EDE0C8', borderRadius: 8, marginBottom: 8 }} />
            <div style={{ width: '80%', height: 10, background: '#F7F0E3', borderRadius: 6 }} />
          </div>
        ))}
      </div>

      {/* Main list */}
      <div style={{ background: 'white', border: '1px solid #EDE0C8', borderRadius: 12, overflow: 'hidden' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: i < 6 ? '1px solid #F7F0E3' : 'none' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F7F0E3', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '35%', height: 14, background: '#EDE0C8', borderRadius: 6, marginBottom: 8 }} />
              <div style={{ width: '55%', height: 11, background: '#F7F0E3', borderRadius: 6 }} />
            </div>
            <div style={{ width: 120, height: 8, background: '#F7F0E3', borderRadius: 6 }} />
            <div style={{ width: 80, height: 24, background: '#F7F0E3', borderRadius: 9999 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
