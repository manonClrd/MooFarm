import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Tu ajouteras tes futures pages ici, par exemple : */}
        {/* <Route path="/cows" element={<Cows />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;