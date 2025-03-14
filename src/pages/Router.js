import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AboutPj from "./pages/AboutUs";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/aboutpj" element={<AboutPj />} />
      </Routes>
    </Router>
  );
}

export default App;
