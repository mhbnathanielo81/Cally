import React from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; message: string; }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', padding: '32px' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>{this.state.message}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
