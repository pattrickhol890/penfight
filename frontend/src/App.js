import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PenFight from "@/pages/PenFight";
import { AuthProvider } from "@/context/AuthContext";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PenFight />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
