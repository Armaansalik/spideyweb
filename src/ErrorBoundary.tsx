import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * A blank canvas with no visible error is the single most common
 * complaint with WebGL/R3F apps - a thrown error inside the render
 * loop (or during React's render) can silently stop everything with
 * nothing in the DOM to tell you why. This boundary makes sure that
 * never happens: any error is shown, in full, on screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] caught:', error, info);
    this.setState({ error, info });
  }

  render() {
    const { error, info } = this.state;
    if (error) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#0a0f18',
            color: '#ff8fa0',
            fontFamily: 'Consolas, "SFMono-Regular", monospace',
            padding: '32px',
            overflow: 'auto',
            zIndex: 9999,
          }}
        >
          <div style={{ color: '#7fe8ff', fontSize: 14, letterSpacing: 2, marginBottom: 16 }}>
            APPLICATION ERROR — see details below (also logged to the browser console)
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{error.name}: {error.message}</div>
          <pre style={{ fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#d8e8f0' }}>
            {error.stack}
          </pre>
          {info?.componentStack && (
            <>
              <div style={{ color: '#7fe8ff', fontSize: 12, marginTop: 20, marginBottom: 8 }}>COMPONENT STACK</div>
              <pre style={{ fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#9db2c0' }}>
                {info.componentStack}
              </pre>
            </>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
