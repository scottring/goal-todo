import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Caught error: ", error, errorInfo);
    this.setState({errorInfo: errorInfo});
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ padding: '20px', border: '1px solid red', backgroundColor: '#fee' }}>
          <h2>Something went wrong.</h2>
          <p>Error: {this.state.error && this.state.error.toString()}</p>
          {this.state.errorInfo && this.state.errorInfo.componentStack && (
            <>
              <h3>Component Stack Trace:</h3>
              <pre style={{ whiteSpace: 'pre-wrap' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
