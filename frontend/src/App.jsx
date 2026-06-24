import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { WalletProvider } from "./context/WalletContext.jsx";
import Home from "./pages/Home.jsx";
import CreatePact from "./pages/CreatePact.jsx";
import JoinPact from "./pages/JoinPact.jsx";
import PactDashboard from "./pages/PactDashboard.jsx";
import Vote from "./pages/Vote.jsx";
import Resolution from "./pages/Resolution.jsx";
import NotFound from "./pages/NotFound.jsx";
import Navbar from "./components/Navbar.jsx";

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#1e1b2e", color: "#e2e8f0", border: "1px solid #3b3260" },
          }}
        />
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreatePact />} />
          <Route path="/join/:code" element={<JoinPact />} />
          <Route path="/pact/:id" element={<PactDashboard />} />
          <Route path="/pact/:id/vote" element={<Vote />} />
          <Route path="/pact/:id/result" element={<Resolution />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}
