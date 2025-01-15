import Header from './Header';
import ChatView from './chat/ChatView';

export default function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <ChatView />
    </div>
  );
} 