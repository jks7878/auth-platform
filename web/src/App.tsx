import { BrowserRouter, Routes, Route } from "react-router-dom";

import SignPage from "./pages/sign/SignPage";
import AuthFlowTestPage from "./pages/auth-test/AuthFlowTestPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignPage />} />

        <Route
          path="/auth-test"
          element={<AuthFlowTestPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}