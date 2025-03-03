
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Use non-null assertion as we know the element exists
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(<App />);
