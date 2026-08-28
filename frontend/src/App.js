import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PenFight from "@/pages/PenFight";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PenFight />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
