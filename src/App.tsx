import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { ChannelProvider } from './contexts/channel/ChannelProvider';
import AppRoutes from './routes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChannelProvider>
          <AppRoutes />
        </ChannelProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
